"""
Utilities functions
"""
import re
from typing import List
import datetime
from time import perf_counter
from io import StringIO

from cvc5 import Kind, Term

newline = "\n"

class Timer:
    """
    Context manager for timing chunks of code. `duration`
    is available for other uses.
    """
    def __init__(self, message: str):
        self._message = message
        self._start = None
        self.duration = None

    def __enter__(self):
        self._start = perf_counter()
        return self  # Return the context manager instance

    def __exit__(self, exc_type, exc_val, exc_tb):
        end = perf_counter()
        self.duration = end - self._start
        print(f"Execution time for {self._message}: {self.duration:.2f} seconds")

def extract_result(text: str) -> str:
    """
    If there are multiple matches, return the last one.

    >>> extract_result("abc<result>def</result>ghi")
    'def'
    >>> extract_result("abc<result>def</result>ghi<result>hello</result>")
    'hello'
    """
    pattern = r"<result>\s*(.*?)\s*</result>"
    matches = re.findall(pattern, text, re.DOTALL)
    return matches[-1].strip() if len(matches) > 0 else None

def parse_sexpr_from_str(sexpr: str, verbose: bool=False):
    """
    Note that everything, incl numbers, is returned as str objects.

    >> > parse_sexpr_from_str("42")
    '42'

    >> > parse_sexpr_from_str('"42"')
    '42'

    >> > parse_sexpr_from_str('"42 \\\\" 43"')
    '42 " 43'

    >> > parse_sexpr_from_str("(a b)")
    ['a', 'b']

    >> > parse_sexpr_from_str("(a)")
    ['a']

    >> > parse_sexpr_from_str("(a (b c) d)")
    ['a', ['b', 'c'], 'd']

    >>> parse_sexpr_from_str("(not (= (heart-rate 12815) 55.0))")
    ['not', ['=', ['heart-rate', '12815'], '55.0']]
    """
    sexpr = sexpr.strip()
    if verbose:
        print(f"parse_sexpr_from_str {sexpr}")
    context = [[]]  # context[-1] is currently being extended
    idx = 0
    def scan_to_end_of_token():
        """
        store token in context, maybe push/pop context,
        and update idx to point to next char after the token.
        """
        nonlocal idx
        whitespace = {" ", "\t", "\n"}
        if sexpr[idx] == '"':
            # very simple, don't allow \"
            idx += 1
            token = ""
            while idx < len(sexpr) and sexpr[idx] != '"':
                if sexpr[idx] == "\\" and idx + 1 < len(sexpr):
                    if sexpr[idx+1] == '"':
                        token += '"'
                        idx += 2
                    elif sexpr[idx+1] == "\"":
                        token += "\\"
                        idx += 2
                    else:
                        token += sexpr[idx]
                        token += sexpr[idx+1]
                        idx += 2
                else:
                    token += sexpr[idx]
                    idx += 1
            if idx >= len(sexpr):
                print(f"Invalid s-expr, string not terminated: {sexpr}")
                return
            idx += 1
        else:
            start = idx
            while idx < len(sexpr) and sexpr[idx] not in whitespace.union({")"}):
                idx += 1
            if idx >= len(sexpr):
                token = sexpr[start:]
            else:
                token = sexpr[start:idx+1]
                while len(token) > 0 and token[0] == "(":
                    context.append([])
                    token = token[1:]
                    if verbose:
                        print(f"Processed '(', token {token} context {context}")
                while len(token) > 0 and token[0] == ")":
                    x = context.pop()
                    context[-1].append(x)
                    token = token[1:]
                    if verbose:
                        print(f"Processed ')', token {token} context {context}")
                while len(token) > 0 and token[-1] == ")":
                    # deal with each ")" later
                    token = token[:-1]
                    idx -= 1
                token = token.strip()
                idx += 1

        if len(token) > 0:
            context[-1].append(token)
        if verbose:
            print(f"scan_to_end_of_token -> {token} "
                  f"@ {idx} <<{sexpr[idx:]}>> context {context}")

    while idx < len(sexpr):
        if verbose:
            print(f"+++top of loop; idx {idx} sexpr[idx] {sexpr[idx]} context {context}")
        scan_to_end_of_token()
    if verbose:
        print(f"Finished; context {context}")
    try:
        return context[0][0]
    except IndexError:
        print(f"Context is mangled, s-expr likely broken: {context}, returning None")
        return None


def convert_date_to_epochal(date_string: str) -> int:
    """
    This is an integer number of days, not number of seconds
    
    >>> convert_date_to_epochal("2017-1-1")
    17167
    
    >>> convert_date_to_epochal("2017-1-2")
    17168
    
    >>> convert_date_to_epochal("2005-02-01")
    12815
    
    >>> convert_date_to_epochal("2006-02-01")
    13180
    """
    date_format = "%Y-%m-%d %H:%M:%S%z"
    dt_obj = datetime.datetime.strptime(date_string + " 12:00:00+0000",
                                        date_format)
    # print(f"datetime_obj {dt_obj}")
    timestamp = dt_obj.timestamp()
    # print(f"timestamp {timestamp}")
    return int(timestamp/(60*60*24))

def convert_epochal_to_str(epochal_date: int) -> str:
    """
    >>> convert_epochal_to_str(17167)
    '2017-01-01'

    >>> for unix_time in [17000, 16500, 18000, 180001, 18002]:
    ...   assert convert_date_to_epochal(convert_epochal_to_str(17000)) == 17000
    
    """
    epochal_time = epochal_date * (60 * 60 * 24)
    # print(f"epochal_time {epochal_time}")
    dt_obj = datetime.datetime.utcfromtimestamp(epochal_time)
    # print(f"dt_object {dt_obj}")
    return dt_obj.strftime("%Y-%m-%d") # %H:%M:%S")

def join_fancy(*args: List[str]) -> str:
    """
    >>> join_fancy('a')
    'a'
    >>> join_fancy('a', 'b')
    'a and b'
    >>> join_fancy('a', 'b', 'c')
    'a, b, and c'
    """
    if len(args) == 1:
        return args[0]
    elif len(args) == 2:
        return f"{args[0]} and {args[1]}"
    else:
        return f"{', '.join(args[:-1])}, and {args[-1]}"


def print_types(term, indent:str = ""):
    """
    Just for debugging
    """
    # print(f"print_types {term} {type(term)}")
    if isinstance(term, (str, int, float)):
        print(f"types>{indent}{type(term)} value <<{term}>>")
    else:
        print(f"types>{indent}term.kind = {term.getKind()} value <<{term}>>")
        # print(dir(term))
        if term.getKind() in {Kind.NOT, Kind.EQUAL, Kind.AND, Kind.OR}:
            for i in range(term.getNumChildren()):
                print_types(term[i], indent+"    ")

class IndentedIO (StringIO):
    """
    Like StringIO() but behind the scenes keeps track of
    how many characters into the current line we are at.
    """
    def __init__(self, *args, **kwargs):
        if "curr_indent" in kwargs:
            self._curr_indent = int(kwargs["curr_indent"])
            del kwargs["curr_indent"]
        else:
            self._curr_indent = 0
        super().__init__(*args, **kwargs)
        self._next_indents = [0]

    def get_curr_indent(self) -> int:
        return self._curr_indent

    def new_next_indent(self, indent: int):
        self._next_indents.append(indent)

    def pop_next_indent(self):
        self._next_indents.pop()

    def write(self, s: str):
        for char in s:
            super().write(char)
            if char == "\n":
                super().write(" "*self._next_indents[-1])
                self._curr_indent = self._next_indents[-1]
            else:
                self._curr_indent += 1

def pprint_term(term: Term, indent: int = 0):
    """
    Print a term, indented in a reasonable way.
    """
    one_liner = pprint_term2(term, False, indent)
    if len(one_liner) < 50:
        return one_liner
    else:
        return pprint_term2(term, True, indent)

def pprint_term2(term: Term, with_newlines: bool, indent: int = 0):
    """
    A wrapper around _pprint_term() that takes care
    of the IndentedIO buffer.
    """
    buf = IndentedIO(curr_indent=indent)
    _pprint_term(term, buf, with_newlines)
    return buf.getvalue()

def _pprint_term(term: Term, buf: IndentedIO, with_newlines: bool):
    kind = term.getKind()
    # print(f"_pprint_term {term} {kind}")
    maybe_newline = "\n" if with_newlines else " "
    kind_name = str(kind)[5:].lower()
    if kind in {Kind.FORALL, Kind.EXISTS}:
        buf.new_next_indent(buf.get_curr_indent() + 2)
        buf.write("(")
        buf.write(f"{kind_name}")
        buf.write(" ")
        _pprint_term(term[0], buf, with_newlines)
        buf.write(maybe_newline)
        if term.getNumChildren() >= 3:
            buf.write("(! ")
            buf.new_next_indent(buf.get_curr_indent())
        _pprint_term(term[1], buf, with_newlines)
        if term.getNumChildren() >= 3:
            buf.write(maybe_newline)
            buf.write(":pattern (")
            buf.write(" ".join(map(lambda x: str(x[0]), term[2])))
            buf.write("))")
            buf.pop_next_indent()
        buf.write(")")
        buf.pop_next_indent()
    elif kind in {Kind.AND, Kind.OR, Kind.EQUAL, Kind.IMPLIES}:
        if kind_name == "equal":
            kind_name = "="
        elif kind_name == "implies":
            kind_name = "=>"
        buf.write(f"({kind_name} ")
        buf.new_next_indent(buf.get_curr_indent())
        for idx in range(term.getNumChildren()):
            if idx > 0:
                buf.write(maybe_newline)
            _pprint_term(term[idx], buf, with_newlines)
        buf.write(")")
        buf.pop_next_indent()
    elif kind in {Kind.NOT}:
        buf.write(f"({kind_name} ")
        _pprint_term(term[0], buf, with_newlines)
        buf.write(")")
    else:
        buf.write(str(term))

if __name__ == "__main__":
    import doctest
    doctest.testmod()
