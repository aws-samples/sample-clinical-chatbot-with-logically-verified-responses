# Guide to installation and development

## Dependencies
The primary depencies are on [cvc5](https://pypi.org/project/cvc5/) and [chainlit](https://pypi.org/project/chainlit/), both of which are installed via pip.

For cvc5 you need both the above Python bindings and also you need to install cvc5 itself (follow [these instructions](https://cvc5.github.io/docs/cvc5-1.0.0/installation/installation.html)).

## Files
These are the key files:
* [`app.py`](app.py) is a chainlit application. You can run it as `chainlit run app.py -w`.
* [`utils.py`](utils.py) has common utilities. You can run the unit-tests via `python utils.py`.
* [`cwa.py`](cwa.py) implements the closed world assumption.
## Installation
1. Make sure you have a recent version of Python installed.
1. Create a virtual environment: `python -m venv myenv`
1. Enter that environment: `source myenv/bin/activate`
1. Install Python packages: `pip install -r requirements.txt`
1. Run the chainlit app: `chainlit run app.py -3`
