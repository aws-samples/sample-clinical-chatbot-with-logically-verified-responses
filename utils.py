"""
Utilities functions
"""
import re, logging, struct
from typing import List
import datetime
from time import perf_counter
from io import StringIO

from cvc5 import Kind, Term, TermManager, RoundingMode, Solver
from ieee754 import double, single


NEWLINE = "\n"
logger = logging.getLogger("utils")
logger.setLevel(logging.DEBUG)


def normalize_ws(s: str) -> str:
    """
    Make strings easier to compare.
    """
    s = s.replace("\n", " ")
    length = len(s)
    while True:
        s = s.replace("  ", " ")
        if len(s) == length:
            break
        length = len(s)
    s = s.replace(") )", "))")
    return s


def split_into_chunks(s: str, chunk_size: int, pad_char: str = "0") -> List[str]:
    """
    >>> split_into_chunks("1234", 1)
    ['1', '2', '3', '4']

    >>> split_into_chunks("1234", 2)
    ['12', '34']

    >>> split_into_chunks("1234", 3)
    ['001', '234']

    >>> split_into_chunks("1234", 4)
    ['1234']

    >>> split_into_chunks("", 4)
    ['0000']
    """
    return _split_into_chunks(s, chunk_size, pad_char)


def _split_into_chunks(s: str, chunk_size: int, pad_char: str) -> List[str]:
    if len(s) <= chunk_size:
        return [(pad_char * (chunk_size - len(s))) + s]
    else:
        return _split_into_chunks(s[:-chunk_size], chunk_size, pad_char) + [s[-chunk_size:]]

    return [s[i:i+chunk_size] for i in range(0, len(s), chunk_size)]


def ones_and_zeros_to_int(s: str) -> int:
    """
    >>> ones_and_zeros_to_int("101")
    5
    >>> ones_and_zeros_to_int("000101")
    5
    """
    if len(s) == 0:
        return 0
    else:
        return ones_and_zeros_to_int(s[:-1]) * 2 + (1 if s[-1] == "1" else 0)


def ones_and_zeros_to_bytes(s: str) -> bytes:
    """
    Given a string "010....01000" convert into a bytes object.
    Left pad with 0s.
    Ignore spaces (this just makes debugging easier).

    >>> ones_and_zeros_to_bytes("01001000").hex()
    '48'

    >>> ones_and_zeros_to_bytes("1 01001000").hex()
    '0148'
    """
    s = s.replace(" ", "")
    # print(f"s: {s}")
    chunks = split_into_chunks(s, 8, pad_char="0")
    # print(f"chunks: {chunks}")
    int_chunks = list(map(ones_and_zeros_to_int, chunks))
    # print(f"int chunks {int_chunks}")
    byte_arr = bytearray(len(chunks))
    for i, int_value in enumerate(int_chunks):
        byte_arr[i] = int_value
    return bytes(byte_arr)


def _double_to_fp32(solver: Solver, x: float) -> Term:
    """
    This is just for debugging

    > >> _double_to_fp32(Solver(), -3.14)
    0 10000000000 1001000111101011100001010001111010111000010100011111
    """

    ieee754_num = single(x)
    print(f"ieee754num: {ieee754_num}")
    assert len(ieee754_num.sign) == 1
    assert len(ieee754_num.exponent) == 8
    assert len(ieee754_num.mantissa) == 23
    bit_str = ieee754_num.sign + ieee754_num.exponent + ieee754_num.mantissa
    print(f"bit_str {len(bit_str)} {bit_str}")
    bv = solver.mkBitVector(32, bit_str, 2)
    rv = solver.mkFloatingPoint(len(ieee754_num.exponent),
                                len(ieee754_num.sign) + len(ieee754_num.mantissa),
                                bv)
    fp_val = rv.getFloatingPointValue()
    print(f"fp_val {fp_val}")
    return rv

def double_to_fp64(solver: Solver, x: float) -> Term:
    """
    Python float is 64 bits.

    >>> double_to_fp64(Solver(), 13.375)
    (fp #b0 #b10000000010 #b1010110000000000000000000000000000000000000000000000)

    >>> double_to_fp64(Solver(), -13.375)
    (fp #b1 #b10000000010 #b1010110000000000000000000000000000000000000000000000)

    """

    # rv = solver.mkFloatingPoint(11, 53, solver.mkBitVector(64, binary_representation, 2))
    ieee754_num = double(x)
    # print(f"ieee754num: {ieee754_num}")
    assert len(ieee754_num.sign) == 1
    assert len(ieee754_num.exponent) == 11
    assert len(ieee754_num.mantissa) == 52
    bit_str = ieee754_num.sign + ieee754_num.exponent + ieee754_num.mantissa
    # print(f"bit_str {bit_str}")
    bv = solver.mkBitVector(64, bit_str, 2)
    rv = solver.mkFloatingPoint(len(ieee754_num.exponent),
                                len(ieee754_num.sign) + len(ieee754_num.mantissa),
                                bv)
    return rv


def fp64_to_float(x: Term) -> float:
    """
    x is a 64-bit floating point Term, return that as a Python double.

    >>> fp64_to_float(double_to_fp64(Solver(), 3.1415))
    3.1415

    >>> fp64_to_float(double_to_fp64(Solver(), 42))
    42.0
    
    >>> fp64_to_float(double_to_fp64(Solver(), 10))
    10.0
    
    >>> fp64_to_float(double_to_fp64(Solver(), 55))
    55.0
    
    >>> fp64_to_float(double_to_fp64(Solver(), -55))
    -55.0
    
    >>> fp64_to_float(double_to_fp64(Solver(), 100))
    100.0

    >>> fp64_to_float(double_to_fp64(Solver(), -100))
    -100.0
    """
    exp_width, significant_width, bits_term = x.getFloatingPointValue()
    assert (exp_width, significant_width) == (11, 53)
    bits_str = bits_term.getBitVectorValue()
    # print(f"bits str {type(bits_str)} {len(bits_str)} {bits_str}")
    bits = ones_and_zeros_to_bytes(bits_str)
    # print(f"bits {type(bits)} {len(bits)} {bits}")
    return struct.unpack(">d", bits)[0]  # big endian

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
    rv = matches[-1].strip() if len(matches) > 0 else None
    logger.info("extract_result -> %s", rv)
    return rv

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


def dump_term(term: Term, indent:str = "") -> str:
    buf = StringIO()
    dump_term2(term, buf, indent)
    return buf.getvalue()

def dump_term2(term: Term, buf: StringIO, indent:str = ""):
    # print(f"dump_term {term} {type(term)}")
    if isinstance(term, (str, int, float)):
        buf.write(f"dump>{indent}{type(term)} value <<{term}>>\n")
    else:
        kind = term.getKind()
        buf.write(f"dump>{indent}kind = {kind} value <<{term}>>\n")
        if term.getNumChildren() > 0:
            for i in range(term.getNumChildren()):
                dump_term2(term[i], buf, indent+"    ")

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

def pprint_term(term: Term, indent: int = 0) -> str:
    """
    Print a term, indented in a reasonable way.
    """
    one_liner = pprint_term2(term, False, indent)
    if len(one_liner) < 50:
        return one_liner
    else:
        return pprint_term2(term, True, indent)

def pprint_term2(term: Term, with_newlines: bool, indent: int = 0) -> str:
    """
    A wrapper around _pprint_term() that takes care
    of the IndentedIO buffer.
    """
    # logger.info("pprint_term2 %s %s %d", str(term), str(with_newlines), indent)
    buf = IndentedIO(curr_indent=indent)
    _pprint_term(term, buf, with_newlines)
    rv = buf.getvalue()
    # logger.info("pprint_term2 %s -> %s", str(term), rv)
    return rv

def _pprint_term(term: Term, buf: IndentedIO, with_newlines: bool):
    # logging.info("_pprint_term %s %s", str(term), type(term))
    kind = term.getKind()
    # logging.info("kind %s", str(kind))
    maybe_newline = "\n" if with_newlines else " "
    kind_name = str(kind)[5:].lower()
    if kind in {Kind.FORALL, Kind.EXISTS}:
        buf.new_next_indent(buf.get_curr_indent() + 2)
        buf.write("(")
        buf.write(f"{kind_name}")
        buf.write(" ")
        # _pprint_term(term[0], buf, with_newlines)
        buf.write("(")
        for var in term[0]:
            buf.write("(" + str(var) + " ")
            if "FloatingPoint" in str(var.getSort()):
                buf.write("FP")
            else:
                buf.write(str(var.getSort()))
            buf.write(")")
        buf.write(")")

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
    elif kind in {Kind.AND, Kind.OR, Kind.EQUAL, Kind.FLOATINGPOINT_EQ,
                  Kind.IMPLIES, Kind.FLOATINGPOINT_LT, Kind.FLOATINGPOINT_LEQ,
                  Kind.FLOATINGPOINT_GT, Kind.FLOATINGPOINT_GEQ,
                  Kind.LT, Kind.LEQ, Kind.GT, Kind.GEQ}:
        new_kind_name = {
            "equal": "=",
            "implies": "=>",
            "gt": ">",
            "lt": "<",
            "geq": ">=",
            "leq": "<=",
            "floatingpoint_eq": "fp=",
            "floatingpoint_lt": "fp<",
            "floatingpoint_gt": "fp>",
            "floatingpoint_leq": "fp<=",
            "floatingpoint_geq": "fp>="
        }.get(kind_name, kind_name)
        # print(f"kind_name {kind_name} -> {new_kind_name}")
        buf.write(f"({new_kind_name} ")
        buf.new_next_indent(buf.get_curr_indent())
        for idx in range(term.getNumChildren()):
            if idx > 0:
                buf.write(maybe_newline)
            _pprint_term(term[idx], buf, with_newlines)
        buf.write(")")
        buf.pop_next_indent()
    elif kind == Kind.NOT:
        buf.write(f"({kind_name} ")
        _pprint_term(term[0], buf, with_newlines)
        buf.write(")")
    elif kind == Kind.INTERNAL_KIND:
        buf.write(str(term))
    elif kind == Kind.CONST_FLOATINGPOINT:
        if term.isFloatingPointNaN():
            buf.write("NaN")
        else:
            buf.write(str(fp64_to_float(term)))
    elif kind == Kind.APPLY_CONSTRUCTOR:
        if term.getNumChildren() == 0:
            buf.write(str(term))
        elif term.getNumChildren() == 1:
            buf.write(str(term))
        else:
            buf.write("(" + str(term[0]))
            for i, child in enumerate(term):
                if i > 0:
                    buf.write(" ")
                    _pprint_term(child, buf, with_newlines)
            buf.write(")")
    elif kind == Kind.APPLY_UF:
        if term.getNumChildren() == 0:
            buf.write(term[0])
        else:
            buf.write("(" + str(term[0]))
            for i, child in enumerate(term):
                if i > 0:
                    buf.write(" ")
                    _pprint_term(child, buf, with_newlines)
            buf.write(")")
    elif term.getNumChildren() > 0:
        buf.write("(" + kind_name)
        for i, child in enumerate(term):
            buf.write(" ")
            _pprint_term(child, buf, with_newlines)
        buf.write(")")
    else:
        buf.write(str(term))

if __name__ == "__main__":
    import doctest
    logging.basicConfig(
        format="%(levelname)s | %(name)s | %(message)s",
        handlers=[logging.StreamHandler()],
        level=logging.DEBUG)
    doctest.testmod()
