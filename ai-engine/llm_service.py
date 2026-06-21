"""
LLM Service - 统一的 LLM 调用层
支持 OpenAI GPT-4o、Anthropic Claude、DeepSeek
支持流式响应
"""

import os
import json
import logging
from typing import Optional, Dict, Any, List, AsyncIterator
from abc import ABC, abstractmethod
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)


class LLMProvider(ABC):
    """LLM 提供者基类"""

    @abstractmethod
    async def generate(self, prompt: str, system_prompt: str = "") -> str:
        pass

    @abstractmethod
    async def generate_stream(self, prompt: str, system_prompt: str = "") -> AsyncIterator[str]:
        """流式生成"""
        pass


class OpenAIProvider(LLMProvider):
    """OpenAI GPT-4o 提供者"""

    def __init__(self):
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = os.getenv("AI_MODEL", "gpt-4o")

    async def generate(self, prompt: str, system_prompt: str = "") -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7,
            max_tokens=4096,
            response_format={"type": "json_object"},
        )

        return response.choices[0].message.content

    async def generate_stream(self, prompt: str, system_prompt: str = "") -> AsyncIterator[str]:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7,
            max_tokens=4096,
            stream=True,
        )

        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


class AnthropicProvider(LLMProvider):
    """Anthropic Claude 提供者"""

    def __init__(self):
        from anthropic import AsyncAnthropic
        self.client = AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        self.model = os.getenv("AI_MODEL", "claude-sonnet-4-20250514")

    async def generate(self, prompt: str, system_prompt: str = "") -> str:
        response = await self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            system=system_prompt if system_prompt else "You are a helpful assistant.",
            messages=[{"role": "user", "content": prompt}],
        )

        return response.content[0].text

    async def generate_stream(self, prompt: str, system_prompt: str = "") -> AsyncIterator[str]:
        async with self.client.messages.stream(
            model=self.model,
            max_tokens=4096,
            system=system_prompt if system_prompt else "You are a helpful assistant.",
            messages=[{"role": "user", "content": prompt}],
        ) as stream:
            async for text in stream.text_stream:
                yield text


class DeepSeekProvider(LLMProvider):
    """DeepSeek 提供者（兼容 OpenAI API 格式）"""

    def __init__(self):
        from openai import AsyncOpenAI
        self.client = AsyncOpenAI(
            api_key=os.getenv("DEEPSEEK_API_KEY"),
            base_url=os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com"),
        )
        self.model = os.getenv("DEEPSEEK_MODEL", "deepseek-chat")

    async def generate(self, prompt: str, system_prompt: str = "") -> str:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        logger.info(f"Calling DeepSeek model: {self.model}")

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7,
            max_tokens=8192,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content
        logger.info(f"DeepSeek response received, tokens: {response.usage}")
        return content

    async def generate_stream(self, prompt: str, system_prompt: str = "") -> AsyncIterator[str]:
        messages = []
        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})
        messages.append({"role": "user", "content": prompt})

        stream = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            temperature=0.7,
            max_tokens=8192,
            stream=True,
        )

        async for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


class LLMService:
    """统一 LLM 服务"""

    def __init__(self):
        provider_name = os.getenv("AI_PROVIDER", "deepseek").lower()
        logger.info(f"Initializing LLM provider: {provider_name}")

        if provider_name == "anthropic":
            self.provider = AnthropicProvider()
        elif provider_name == "deepseek":
            self.provider = DeepSeekProvider()
        else:
            self.provider = OpenAIProvider()

        logger.info(f"LLM provider initialized: {type(self.provider).__name__}")

    async def generate(self, prompt: str, system_prompt: str = "") -> str:
        return await self.provider.generate(prompt, system_prompt)

    async def generate_stream(self, prompt: str, system_prompt: str = "") -> AsyncIterator[str]:
        """流式生成"""
        async for chunk in self.provider.generate_stream(prompt, system_prompt):
            yield chunk

    async def generate_json(self, prompt: str, system_prompt: str = "") -> Dict[str, Any]:
        """生成并解析 JSON 响应"""
        response = await self.generate(prompt, system_prompt)

        # 检查空响应
        if not response:
            raise ValueError("LLM 返回了空响应")

        # 尝试解析 JSON
        try:
            # 处理可能的 markdown 代码块
            if response.startswith("```json"):
                response = response[7:]
            if response.startswith("```"):
                response = response[3:]
            if response.endswith("```"):
                response = response[:-3]

            return json.loads(response.strip())
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}\nResponse: {response[:500]}")
            raise ValueError(f"LLM 返回的不是有效 JSON: {e}\n响应内容: {response[:500]}")


# 全局实例
llm_service = LLMService()
