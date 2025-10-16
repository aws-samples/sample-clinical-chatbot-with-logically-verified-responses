"""
This is an interface between the back-end and the front-end (UX).
This should make it easier to support multiple front ends.
"""

import datetime, logging
from textwrap import dedent
from random import choice
import traceback
import dataclasses
from typing import List, Dict, Optional, Iterator
import rich

from cvc5 import Term, Result
from strands import Agent, tool

from utils import Timer, extract_result, newline
from core import (solver, convert_epochal_to_str, convert_date_to_epochal,
                  check_statement_validity, pprint_term)

logging.basicConfig(
    format="%(levelname)s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler()]
)
# Enable the debug level specifically for the Strands SDK
logging.getLogger("interface").setLevel(logging.INFO)

logging.info("Testing logging")
extraction_model_id = "global.anthropic.claude-sonnet-4-20250514-v1:0"
# extraction_model_id = "anthropic.claude-opus-4-1-20250805-v1:0"
# extraction_model_id = "us.anthropic.claude-3-haiku-20240307-v1:0"
chatbot_model_id = "us.anthropic.claude-3-haiku-20240307-v1:0"
corruption_model_id = "us.anthropic.claude-3-haiku-20240307-v1:0"


FACTS_NAT_LANG: Optional[List[str]] = None
AXIOMS_AS_STR: Optional[List[str]] = None

def get_facts_nat_lang() -> List[str]:
    """
    Return a list of strings (one per line) that represent
    the facts in English.
    """
    global FACTS_NAT_LANG
    if FACTS_NAT_LANG is None:
        with solver() as s:
            FACTS_NAT_LANG = s.convert_facts_to_natural_language(s.generate_facts())
        print(f"FACTS_NAT_LANG:\n{newline.join(FACTS_NAT_LANG)}\n===========")
    return FACTS_NAT_LANG

def get_axioms_as_str() -> List[str]:
    """
    Similar to get_facts_nat_lang() except each line is a well-formed
    first-order formula.
    """
    global AXIOMS_AS_STR
    if AXIOMS_AS_STR is None:
        with solver() as s:
            facts = s.generate_facts()
            axioms = s.generate_all_axioms(facts)
            # Return axioms exactly as they come from the theorem prover
            AXIOMS_AS_STR = [pprint_term(axiom) for axiom in axioms]
        print(f"AXIOMS_AS_STR:\n{newline.join(AXIOMS_AS_STR)}\n===========")
    return AXIOMS_AS_STR

TODAY = convert_epochal_to_str(int(datetime.datetime.now().timestamp()/
                                   (60 * 60 * 24)))

@tool
def convert_date_to_epochal_tool(date_string: str) -> int:
    """
    Given a date, like '2002-10-05', convert it into an integer
    which is the number of _days_ from the Unix epoch start.
    """
    print("in convert_date_to_epochal_tool")
    return convert_date_to_epochal(date_string)

def extract_logical_statement(nat_lang_statement: str) -> str:
    """
    Given the response from the AI (a string), use another LLM
    inference to extract a string representing the response in
    first-order logic.
    """
    this_system_prompt = dedent("""\
        You are an expert at first-order logic.
        """)
    this_agent = Agent(system_prompt=this_system_prompt,
                       model=extraction_model_id,
                       tools=[convert_date_to_epochal_tool])
    print(this_agent.model.config)
    prompt = dedent(f"""\
        Your task is to convert a natural language statement into a first-order logical well-formed formula.
        You have available the following functions:
        * (heart-rate time) -> real. This represents a measurement of the patient's heart rate at a
          particular `time`. The `time` is Unix-style epochal time. The value of (heart-rate a_time) is a
          real number indicating the value that was measured at `a_time`.
        * (weight time) -> real. This represents a measurement of the patient's weight at a
          particular `time`. The `time` is Unix-style epochal time. The value of (weight a_time) is a
          real number indicating the value that was measured at `a_time`.
        * name -> string. This is a zero-arity function (a constant) whose value is the name of the patient.
        * birth-date -> real. This is a zero-arity function (a constant) whose value is the
          birth date of the patient (represented as Unix-style epochal).
        * age -> real. This is a zero-arity function (a constant) whose value is the
          age of the patient in years.
        * (D ICD-code time) -> tfu_true/tfu_false/tfu_unknown. This represents whether the 
          patient was diagnosed as having ICD code `ICD-code` on or before `time`.

        Unix-style epochal dates are days (ints), so always 123, never 123.45.
        So a `time` for the `heart-rate`, `weight`, and `D` relations is always an integer.

        To convert a human date to an epochal date, you MUST use the `convert_date_to_epochal_tool`
        tool.

        You can use first-order logic. For example:
        * ```(= X Y)``` asserts that X and Y are equal.
        * ```(not X)``` asserts that X is false.
        * ```(and X Y)``` asserts that both X and Y are true.
        * ```(=> X Y)``` is logically equivalent to ``(or (not X) Y)```.
        * ```(forall ((time Int)) (> (heart-rate time) 50)`` asserts that for all times, the patient's heart rate is more than 50.
        * ```(exists ((time Int)) (> (heart-rate time) 50)`` asserts that there is at least one time at which the patient's heart rate is more than 50.
        
        For example, given the statement

            ```The patient's heart rate 2017-01-01 was 45.6```

        you should convert this into

            ```(= (heart-rate 17167) 45.6)```

        You should return your result in xml tags: <result>....</result>.

        If you're not able to extract a logical statement then you must return "unable to extract".

        Here is the statement I want you to analyze:

        ```{nat_lang_statement}```
        """)
    this_response = this_agent(prompt=prompt)
    print(f"response: {this_response}")
    return extract_result(str(this_response))

chatbot_system_prompt = dedent(f"""\
    You are an expert at first-order logic and healthcare.
    You will be asked questions about a patient and we
    know this about them:

    {f"{newline}    ".join(get_facts_nat_lang())}
    
    The current date is {TODAY}

    When you answer a question, just give the answer as a complete sentence,
    don't explain how you derived the answer.
    """)
print(f"Chatbot system prompt:\n{chatbot_system_prompt}\n===========")

chatbot_agent = Agent(model=chatbot_model_id, system_prompt=chatbot_system_prompt)
print(chatbot_agent.model.config)

def corrupt_response(first_response: str) -> str:
    """ Change the response slightly to mimic a mistake from the chatbot LLM. """
    print(f"corrupt_response {first_response}")
    this_agent = Agent(model=corruption_model_id)
    prompt = dedent(f"""\
        Your task is to change a sentence slightly so that the meaning is different.
        For example, if you were given the sentence "The patient is 10 years old"
        you could respond with "The patient is 11 years old".
        
        Here is the sentence that I want you to modify:
        
        ```
        {first_response}
        ```

        You must enclose your response in XML tags: <result>...</result>
        """)
    this_response = this_agent(prompt=prompt)
    result = str(this_response)
    print(f"Raw result: {result}")
    result = extract_result(result)
    print(f"\nCorruption: {first_response.strip()} -> {result}")
    return result

class Event:
    """
    Events are streamed to the front end for two reasons: one is to 
    give on-the-fly updates as to what the backend is doing (this is
    the `ProgressUpdate` sub-class) and the other is to summarize the
    result at the end (this is the `FinalSummary` event).
    """
    pass

@dataclasses.dataclass
class FinalSummary (Event):
    """
    This contains all information that summarizes this
    calculation of the assistant's response.
    """
    assistant_response: Optional[str] = None
    corrupted_response: Optional[str] = None
    extracted_logical_stmt: Optional[str] = None
    durations: Optional[Dict[str, float]] = None
    valid: Optional[str] = None
    original_result: Optional[Result] = None
    negated_result: Optional[Result] = None
    error_messages: Optional[List[str]] = None
    extra_delay: Optional[float] = None # seconds

@dataclasses.dataclass
class ProgressUpdate (Event):
    """
    This is just a message to be displayed to the user to show what we are
    doing in the background to generate the assistant's response.
    """
    message: str

    def __init__(self, message: str):
        print(f"New progress update: {message}")
        self.message = message

def process_user_response_streaming(
    user_response: str,
    do_corrupt: bool=True) -> Iterator[Event]:
    """
    This is a generator function, that streams a series of `response` instances
    that indicate the progress.
    """
    logging.info(f"process_user_response_streaming {user_response} {do_corrupt}")
    assistant_response: Optional[str] = None
    corrupted_response: Optional[str] = None
    valid: Optional[str] = None
    original_result: Optional[Result] = None
    negated_result: Optional[Result] = None
    extracted_logical_stmt: Optional[str] = None
    durations: Dict[str, float] = {}
    error_messages: List[str] = []
    
    try:
        yield ProgressUpdate("Computing initial response...")

        llm_timer = Timer("LLM")
        with llm_timer:
            assistant_response = chatbot_agent(user_response)
            assistant_response = str(assistant_response).strip()
        yield ProgressUpdate(f"Initial response: {assistant_response}")

        if do_corrupt and choice([True,False]):
            yield ProgressUpdate(f"Corrupting response...")
            corrupt_timer = Timer("Extraction")
            with corrupt_timer:
                corrupted_response = corrupt_response(assistant_response)
                corrupted_response = str(corrupted_response).strip()
            yield ProgressUpdate(f"Corrupted response: {corrupted_response}")
        else:
            corrupted_response = None
            corrupt_timer = None
        extract_timer = Timer("Extraction")
        with extract_timer:
            try:
                extracted_logical_stmt = extract_logical_statement(corrupted_response or assistant_response)
                print(f"extracted_logical_stmt: {extracted_logical_stmt}")
                if "unable to extract" in extracted_logical_stmt:
                    extracted_logical_stmt = None
            except Exception as ex:
                print(f"Caught in extract_timer: {ex}")
                extracted_logical_stmt = None
        yield ProgressUpdate(f"Extracted: <tt>{extracted_logical_stmt}</tt>")
        
        tp_timer = None
        try:
            if extracted_logical_stmt:
                tp_timer = Timer("theorem prover")
                with tp_timer:
                    try:
                        valid, original_result, negated_result =\
                            check_statement_validity(extracted_logical_stmt)
                    except Exception as ex:
                        print(f"ex: {ex}")
                        traceback.print_exc()
                        valid = "unknown"
                print(f"valid: {valid}")
                yield ProgressUpdate(f"Validity: {valid} original {original_result} negated {negated_result}")
        except Exception as ex:
            print(ex)
        
        # Always create timers dict and durations, regardless of success/failure
        timers = {
            "agent": llm_timer,
            "theorem prover": tp_timer,
            "extraction": extract_timer,
            "corruption": corrupt_timer
        }
        # remove any Timers that didn't run
        durations = {name: timer.duration
                        for name, timer in timers.items()
                        if timer is not None}
        print(f"durations {durations}")
    
    except Exception as e:
        print(f"ERROR in process_user_response_streaming: {e}")
        print(f"Full traceback: {traceback.format_exc()}")
        error_messages += str(e)
    yield FinalSummary(durations=durations,
                       assistant_response=assistant_response,
                       corrupted_response=corrupted_response,
                       extracted_logical_stmt=extracted_logical_stmt,
                       valid=valid,
                       original_result=str(original_result),
                       negated_result=str(negated_result),
                       error_messages=error_messages,
                       extra_delay=5.0)

def process_user_response(
    user_response: str,
    do_corrupt: bool=True) -> FinalSummary:
    """
    A wrapper around process_user_response_streaming() that turns it into
    a non-streaming call.
    """
    last_event = None
    for event in process_user_response_streaming(user_response, do_corrupt):
        print("Got event:")
        rich.print(event)
        last_event = event
    assert isinstance(last_event, FinalSummary)
    return last_event

if __name__ == "__main__":
    # user_response = "Is the patient more than 10 years old?"
    # user_response = "What is the patient's name?"
    test_user_resp = "What is the patient's most recent heart rate measurement?"
    response = process_user_response(test_user_resp, do_corrupt=False)
    rich.print(response)
    print("Finished")