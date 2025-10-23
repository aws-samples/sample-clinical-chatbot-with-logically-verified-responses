"""
The chainlit app.
"""

from utils import NEWLINE
from interface import process_user_response, get_facts_nat_lang
from textwrap import dedent

import rich
import chainlit as cl

@cl.on_chat_start
async def start():
    elements = [
        cl.Text(name="This patient's health records", content=NEWLINE.join(get_facts_nat_lang()), display="inline")
    ]
    await cl.Message(content="",
                     elements=elements).send()

@cl.on_message
async def main(message: cl.Message):
    response = process_user_response(message.content)
    assert response is not None
    rich.print(response)
    if response.valid == "true":
        message = "# ✓\nNo contradictions found."
    elif response.valid == "false":
        message = "# ❌\nContradictions found."
    elif response.valid == "unknown":
        message = "# ?\nUnable to analyze statement."
    durations_str = ", ".join(f"{duration:.2f} secs ({name})" for name, duration in response.durations.items())
    content = dedent(f"""{message}\nAsserted formula: `{response.extracted_logical_stmt}`
                        [durations: {durations_str}""")
    print(f"content: <<{content}>>")
    await cl.Message(
        content=response.corrupted_response,
        elements=[cl.Text(name="Validation",
                          content=content,
                          display="inline")]
    ).send()
