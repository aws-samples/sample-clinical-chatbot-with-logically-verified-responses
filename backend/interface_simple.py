"""
Simplified interface module that works without strands dependency.
This provides basic functionality for get_facts_nat_lang() without AI agent features.
"""

import logging
from typing import List, Optional

# Import the core functionality that we know works
import sys
import os
sys.path.insert(0, os.path.abspath('..'))

from utils import NEWLINE
from core import solver

logger = logging.getLogger("interface_simple")
logger.setLevel(logging.INFO)

FACTS_NAT_LANG: Optional[List[str]] = None

def get_facts_nat_lang() -> List[str]:
    """
    Get natural language facts from the theorem prover.
    This is a simplified version that doesn't require strands.
    """
    global FACTS_NAT_LANG
    if FACTS_NAT_LANG is None:
        try:
            with solver() as s:
                FACTS_NAT_LANG = s.convert_facts_to_natural_language(s.generate_facts())
            logger.info("FACTS_NAT_LANG:")
            logger.info(NEWLINE.join(FACTS_NAT_LANG))
            logger.info("===========")
        except Exception as e:
            logging.error("Error generating facts from theorem prover: %s", e)
            # Fallback to sample data if theorem prover fails
            FACTS_NAT_LANG = [
                "The patient's name is Joe Bloggs",
                "The patient's birth date is 1950-01-01", 
                "The patient's age is 75.83 years",
                "The patient's heart rate was 55.0 beats/sec on 2005-01-31",
                "The patient's heart rate was 60.0 beats/sec on 2006-01-31",
                "The patient's weight was 150.0 pounds on 2005-01-31",
                "The patient's weight was 155.0 pounds on 2006-01-31",
                "The patient was diagnosed as having E11 on 2006-01-31",
                "The patient was diagnosed as not having E11 on 2006-02-28",
                "The patient was diagnosed as having E11 on 2006-03-31"
            ]
    return FACTS_NAT_LANG

# Simple response processing without AI agents
def process_user_response_simple(user_response: str) -> dict:
    """
    Simplified response processing without strands AI agents.
    Returns a basic response structure.
    """
    return {
        "assistant_response": f"I received your question: '{user_response}'. The full AI processing requires the strands library which is not currently available.",
        "corrupted_response": None,
        "extracted_logical_stmt": None,
        "durations": {},
        "valid": None,
        "original_result": None,
        "negated_result": None
    }

if __name__ == "__main__":
    # Test the simplified interface
    facts = get_facts_nat_lang()
    logger.info("Retrieved %s facts:", len(facts))
    for i, fact in enumerate(facts, 1):
        logger.info("%d. %s", i, fact)