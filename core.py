"""
Code to help represent the facts in the medical records and to transform
those into a theory (a set of WFFs)
"""

from typing import List, Tuple, Union, Optional, Dict
from contextlib import contextmanager
from textwrap import dedent
from multiprocessing import Process, Queue
import datetime, os, logging

from cvc5 import Sort, Term, Kind, Result, RoundingMode
import cvc5

from utils import (pprint_term, convert_date_to_epochal,
                   convert_epochal_to_str, join_fancy,
                   parse_sexpr_from_str, NEWLINE,
                   double_to_fp64, normalize_ws, dump_term)

logger = logging.getLogger("core")
logger.setLevel(logging.INFO)
# logger.getLogger("core").setLevel(logger.INFO)
logging.basicConfig(
    format="%(levelname)s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler()],
    level=logging.DEBUG)

diagnosis_date1: int = convert_date_to_epochal("2006-02-01")
diagnosis_date2: int = convert_date_to_epochal("2006-03-01")
diagnosis_date3: int = convert_date_to_epochal("2006-04-01")

SUPPORTED_KINDS = {
    "fp=": Kind.FLOATINGPOINT_EQ,
    "=": Kind.EQUAL,
    "and": Kind.AND,
    "or": Kind.OR,
    "not": Kind.NOT,

    "fp/": Kind.FLOATINGPOINT_DIV,
    "fp+": Kind.FLOATINGPOINT_ADD,
    "fp-": Kind.FLOATINGPOINT_SUB,
    "fp<": Kind.FLOATINGPOINT_LT,
    "fp<=": Kind.FLOATINGPOINT_LEQ,
    "fp>": Kind.FLOATINGPOINT_GT,
    "fp>=": Kind.FLOATINGPOINT_GEQ,

    "/": Kind.DIVISION,
    "+": Kind.ADD,
    "-": Kind.SUB,
    "<": Kind.LT,
    "<=": Kind.LEQ,
    ">": Kind.GT,
    ">=": Kind.GEQ,
    
    "forall": Kind.FORALL,
    "exists": Kind.EXISTS,
    "=>": Kind.IMPLIES,
    "implies": Kind.IMPLIES,
    "->": Kind.IMPLIES}


class Function:
    """
    Represents a relation/function for which we will later create Facts.
    """
    def __init__(self,
                 cvc5_solver, # type is Solver
                 name: str,
                 return_sort: Sort,
                 return_units: Optional[Tuple[str, str]], # singular, plural
                 args: List[Tuple[str, Sort]] = None):
        self.name = name
        self.solver = cvc5_solver
        self.return_sort = return_sort
        self.args = args if args is not None else []
        self.arg_names = [name for name, _sort in self.args]
        self.arg_sorts = [sort for _name, sort in self.args]
        self.return_units = return_units
        if len(self.args) > 0:
            this_sort = self.solver.mkFunctionSort(self.arg_sorts,
                                                    return_sort)
            # print(f"{name} has function sort: {this_sort}")
        else:
            this_sort = return_sort
        self.cvc5_const = self.solver.mkConst(this_sort, name)
        self.solver.add_function(self)

    def __str__(self):
        return f"Function ({self.name} {', '.join(map(str, self.args))} -> {self.return_sort})"

    def __repr__(self):
        return self.__str__()

    def as_natural_language(self, fact) -> str:
        """
        fact has type Fact
        """
        # print(f"as_natural_language")
        s = self.solver
        pprint_name = self.name.replace("_", " ").replace("-", " ")
        def add_units(value, units: Tuple[str, str]):
            # print(f"add_units {value} {type(value)}")
            if units:
                if isinstance(value, (int, float)) :
                    return f"{value} {units[0]}" if value == 1 \
                        else f"{value} {units[1]}"
                elif isinstance(value, (str, Term)):
                    return f"{value} {units[0]}" # @todo needs work
                else:
                    raise Exception(f"port me: {fact}")
            else:
                return value
        if self.name == "D":
            icd_, time_ = fact.args
            maybe_not = "not " if fact.result == self.solver.mk_tfu_false() else ""
            return f"The patient was diagnosed as {maybe_not}having {icd_}"\
                   f" on {convert_epochal_to_str(time_)}"
        elif len(self.args) > 0:
            if "time" in self.arg_names:
                args = [f"{arg_name} {arg_value}"
                        for arg_name, arg_value in zip(self.arg_names, fact.args)
                        if arg_name != "time"]
                time = [arg_value for arg_name, arg_value in zip(self.arg_names, fact.args)
                       if arg_name == "time"][0]
                on_str = f" on {convert_epochal_to_str(time)}"
            else:
                args = [f"{arg_name} {arg_value}"
                        for arg_name, arg_value in zip(self.arg_names, fact.args)]
                on_str = ""
            args_str = "at " + join_fancy(*args) if args else ""
            return f"The patient's {pprint_name}{args_str} was "\
                   f"{add_units(fact.result, self.return_units)}{on_str}"
        else:
            # print(f"self.return_units {self.return_units}")
            if "epochal day" in str(self.return_units).lower():
                result = convert_epochal_to_str(fact.result)
            else:
                result = add_units(fact.result, self.return_units)
            # print(f"result: {result}")
            return f"The patient's {pprint_name} is {result}"

    def generate_core_axioms(self, facts: list):
        """
        facts is of type List[Fact]
        """
        relevant_facts = [fact for fact in facts if self == fact.function]
        results = []
        s = self.solver
        for fact in relevant_facts:
            # print(f"fact.args {fact.args} fact.result {fact.result}")
            if fact.function.name == "D":
                continue
            arg_value_terms = [s.convert_literal_to_term(arg, known_sort=sort)
                                  for arg, sort in zip(fact.args, self.arg_sorts)]
            results_term = s.convert_literal_to_term(fact.result, known_sort=self.return_sort)
            if self.return_sort == s.getBooleanSort():
                if results_term == s.mkBoolean(True):
                    axiom = s.apply(self.cvc5_const, arg_value_terms) if len(self.args) > 0\
                                         else self.cvc5_const
                else:
                    axiom = s.not_(s.apply(self.cvc5_const, arg_value_terms) if len(self.args) > 0\
                                           else self.cvc5_const)
            else:
                logger.info("args {self.args}")
                logger.info("arg_value_terms %s", arg_value_terms)
                logger.info("results_term %s", results_term)
                logger.info("results_term sort %s", results_term.getSort())
                eq_predicate = s.equal_fp if results_term.getSort() == s.fp64_sort\
                               else s.equal 
                axiom = eq_predicate(s.apply(self.cvc5_const, arg_value_terms) if len(self.args) > 0\
                                            else self.cvc5_const,
                                    results_term)
            results.append(axiom)
        return results

    def generate_CWA_axioms(self, facts: List):
        """
        function is of type Function, facts is List[Fact]
        """
        return self.generate_CWA_axioms_for_others(facts)

    def generate_CWA_axioms_for_others(self, facts: List):
        """
        function is of type Function, facts is List[Fact]
        """
        if self.name in {"D"}:
            return [] # these are handled in InterpolatedFunction
        logger.info("generate_CWA_axioms_for_others %s", self.name)
        s = self.solver
        relevant_facts = [fact for fact in facts if self == fact.function]
        logger.info("relevant facts: %s", relevant_facts)
        results = []
        logger.info("self.args %s", self.args)
        if len(self.args) > 0: # otherwise it's a constant, no need for CWA
            formal_args = [s.mkVar(arg_sort, arg_name)
                           for arg_name, arg_sort in self.args]
            logger.info("formal_args %s", formal_args)
            # if self.return_sort == self.solver.fp64_sort:
            #     undefined = s.mkNaN()
            # elif self.return_sort == s.tfu_sort:
            #     undefined = s.mk_tfu_true_or_false()
            # else:
            #     raise Exception(f"port me: {self.return_sort}")
            # undefined = s.undefined_real if self.return_sort == s.getRealSort() else \
            #                 s.undefined_str if self.return_sort == s.getStringSort() else \
            #                    None # this signals an error
            # if formal-args are A and B:
            # (forall (A B)
            #   (= (and (not (and (= A fact_0_A) (= B fact_0_B)))
            #           .... for all facts ....)
            #      (= (F A B) undefined)))
            if len(relevant_facts) > 0:
                not_defined = \
                    s.and_(
                        *[s.not_(
                            s.and_(
                                *[s.equal(
                                    arg_term,
                                    s.convert_literal_to_term(arg_val))
                                  for arg_term, arg_val in zip(formal_args, fact.args)]))
                          for fact in relevant_facts])
            else:
                not_defined = s.mkBoolean(False)
            axiom = s.forall(formal_args,
                        s.equal(
                            not_defined,
                            s.equal_fp(s.apply(self, formal_args),
                                    s.mkNaN())))
            results.append(axiom)
        logger.info("CWA axioms for %s:", self.name)
        logger.info("%s", NEWLINE.join(map(str,results)))
        return results


class InterpolatableFunction (Function):
    """
    A Function where the values at previous dates "propagate" or "interpolate"
    across later dates (until maybe overridden by a more recent fact).
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    def __str__(self):
        return f"InterpFunction ({self.name} "\
               f"{', '.join(map(str, self.args))} -> {self.return_sort})"

    def generate_CWA_axioms(self, facts: List):
        """
        function is of type Function, facts is List[Fact]

        For Interpolatable functions the CWA axioms are different than
        for a regular function. Normally if r(t_0)=v0 and r(t_1)=1
        then for all other times than t_0 and t_1 then r() is undefined.

        For IFs (think: diagnosis) the value "persists" across time. So,
        if r(t_0)=v0 and r(t_1)=1 and t_0 < t_1 then r(t)=v0 for all t
        in [t_0..t_1].

        The function must have one argument with name "time".
        """
        logger.info(f"IF::generate_CWA_axioms {self}")
        if self.name == "D":
            return self.generate_CWA_axioms_for_diagnosis(facts)
        else:
            raise Exception(f"port me! {self}")


    def generate_CWA_axioms_for_diagnosis(self, facts: List):
        """
        function is of type Function, facts is List[Fact]
        """
        logger.info("IF::generate_CWA_axioms_for_diagnosis %s", self)
        assert self.name == "D"
        s = self.solver
        relevant_facts = [fact for fact in facts if self == fact.function]
        observed_icds = {fact.args[0] for fact in relevant_facts}
        logger.info("observed ICDs: %s", observed_icds)
        results = []
        formal_args = [s.mkVar(arg_sort, arg_name)
                        for arg_name, arg_sort in self.args]
        logger.info("formal args %s", formal_args)
        # formal_args is ICD, time
        ICD = s.mkVar(s.getStringSort(), "ICD")
        # t0 = s.mkVar(s.getIntegerSort(), "t0")
        # t1 = s.mkVar(s.getIntegerSort(), "t1")
        time = s.mkVar(s.getIntegerSort(), "time")
        tfu_t = s.mk_tfu_true()
        tfu_f = s.mk_tfu_false()

        for observed_ICD in observed_icds:
            these_facts = [fact for fact in relevant_facts if fact.args[0] == observed_ICD]
            logger.info("Found %s relevant facts for %s",
                        len(these_facts), observed_ICD)
            these_times = {fact.args[1] for fact in these_facts}
            logger.info("These times: %s", these_times)
            min_time, max_time = min(these_times), max(these_times)
            ordered_times = sorted(list(these_times))
            logger.info("Ordered times: %s", ordered_times)
            time2fact = {f.args[1]: f for f in these_facts}
            # each of these is a collection of ranges or 2-tuples,
            # the first element is inclusive, the second is exclusive
            true_disjuncts = []
            false_disjuncts = []
            for i in range(1, len(ordered_times)):
                time1, time2 = ordered_times[i-1], ordered_times[i]
                logger.info("time1 %s time2 %s", time1, time2)
                if time2fact[time1].result == tfu_t:
                    true_disjuncts.append((time1, time2))
                elif time2fact[time1].result == tfu_f:
                    false_disjuncts.append((time1, time2))
                else:
                    raise Exception("explicit unknown D()s are not currently supported")
            last_fact = time2fact[max_time]
            most_recent_diagnosis = last_fact.result
            (true_disjuncts if most_recent_diagnosis == tfu_t else false_disjuncts)\
                .append((max_time, None))
            logger.info("false disjuncts: %s", false_disjuncts)
            logger.info("true disjuncts: %s", true_disjuncts)

            def range2disjunct(start: int, stop: int) -> Term:
                if stop is not None:
                    return s.and_(s.geq(time, s.mkInteger(start)),
                                  s.lt(time, s.mkInteger(stop)))
                else:
                    return s.geq(time, s.mkInteger(start))

            false_disjuncts_terms = [range2disjunct(*range) for range in false_disjuncts]
            logger.info("false disjuncts terms: %s", false_disjuncts_terms)
            true_disjuncts_terms = [range2disjunct(*range) for range in true_disjuncts]
            logger.info("true disjuncts terms: %s", true_disjuncts_terms)

            logger.info("most recent diagnosis %s %s",
                        most_recent_diagnosis,
                        type(most_recent_diagnosis))

            trigger = s.mkTerm(Kind.INST_PATTERN, s.apply(self, [ICD, time]))

            axiom = s.forall([ICD, time],
                        s.equal(s.lt(time, s.mkInteger(min_time)),
                                s.equal(s.apply(self, [ICD, time]),
                                        s.mk_tfu_true_or_false())),
                        s.mkTerm(Kind.INST_PATTERN_LIST, trigger))
            results.append(axiom)

            axiom = s.forall([ICD, time],
                s.equal(s.or_(*true_disjuncts_terms),
                        s.equal(s.apply(self, [ICD, time]),
                                tfu_t)))
            results.append(axiom)

            axiom = s.forall([ICD, time],
                s.equal(s.or_(*false_disjuncts_terms),
                        s.equal(s.apply(self, [ICD, time]),
                                tfu_f)))
            results.append(axiom)
        return results

class Fact:
    """
    Simple facts: a function with some args and a result
    """
    def __init__(self, function: Function, result, *args: List):
        self.function: Function = function
        self.result = result
        self.args = args

    def __str__(self):
        return f"Fact({self.function.name} {self.args} -> {self.result})"

    def __repr__(self): return self.__str__()

    def as_natural_language(self):
        return self.function.as_natural_language(self)


class Solver (cvc5.Solver):
    """
    A wrapper around a cvc5 Solver with some
    custom extras, like setting options.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.setLogic("ALL")
        self.setOption("stats", "true")
        self.setOption("produce-models", "true")
        self.setOption("produce-proofs", "true")
        self.setOption("proof-granularity", "dsl-rewrite")
        self.setOption("produce-difficulty", "true")
        self.setOption("produce-unsat-cores", "true")
        self.setOption("minimal-unsat-cores", "true")
        # self.setOption("print-cores-full", "true")
        self.setOption("output", "trigger")
        self.setOption("output", "inst")
        self.setOption("output", "inst-strategy")
        self.setOption("dump-instantiations", "true")
        self.setOption("dump-instantiations-debug", "true")
        self.setOption("output", "incomplete")
        self.setOption("verbosity", "5")
        self.setOption("enum-inst", "true")

        self.all_functions = []
        self.all_terms = []
        self.all_vars = []

        #
        # TFU = True, False, or Unknown.
        #
        self.tfu_decl = self.mkDatatypeDecl("TFU")
        true_ctor = self.mkDatatypeConstructorDecl("tfu_true")
        self.tfu_decl.addConstructor(true_ctor)
        false_ctor = self.mkDatatypeConstructorDecl("tfu_false")
        self.tfu_decl.addConstructor(false_ctor)
        unknown_ctor = self.mkDatatypeConstructorDecl("tfu_true_or_false")
        self.tfu_decl.addConstructor(unknown_ctor)

        # print(f"tfu_decl = {self.tfu_decl}")
        self.tfu_sort = self.mkDatatypeSort(self.tfu_decl)
        self.tfu = self.tfu_sort.getDatatype()

        # self.undefined_real = self.mkReal(-666.0)
        self.undefined_str = self.mkString("%%undefined%%")
        self.tfu_cache: Dict[str, Term] = None
        #
        # optReal = Either a Real or unknown
        #
        # self.opt_real_decl = self.mkDatatypeDecl("optReal")
        # known_ctor = self.mkDatatypeConstructorDecl("known")
        # known_ctor.addSelector("value", self.getRealSort())
        # self.opt_real_decl.addConstructor(known_ctor)
        # unknown_ctor = self.mkDatatypeConstructorDecl("unknown")
        # self.opt_real_decl.addConstructor(unknown_ctor)
        
        # self.opt_real_sort = self.mkDatatypeSort(self.opt_real_decl)
        # self.opt_real = self.opt_real_sort.getDatatype()
        self.fp64_sort = self.mkFloatingPointSort(11, 53)
        self.rounding_mode = self.mkRoundingMode(RoundingMode.ROUND_NEAREST_TIES_TO_EVEN)

    def __del__(self):
        print(f"Destroying {self}")
        self.all_functions = []
        self.all_terms = []
        self.all_vars = []

    def add_function(self, f: Function):
        self.all_functions.append(f)

    def mkNaN(self) -> Term:
        rv = self.mkFloatingPointNaN(exp=11, sig=53)
        assert rv.isFloatingPointNaN()
        logger.info("This is a NaN: %s", rv)
        return rv

    def mkFp64(self, num: float) -> Term:
        return double_to_fp64(self, num)

    def mkTerm(self, *args, **kwargs) -> Term:
        self.all_terms.append(result := super().mkTerm(*args, **kwargs))
        return result

    def mkReal(self, *args, **kwargs) -> Term:
        self.all_terms.append(result := super().mkReal(*args, **kwargs))
        return result

    def mkInteger(self, *args, **kwargs) -> Term:
        self.all_terms.append(result := super().mkInteger(*args, **kwargs))
        return result

    def mkString(self, *args, **kwargs) -> Term:
        self.all_terms.append(result := super().mkString(*args, **kwargs))
        return result

    def mkBoolean(self, *args, **kwargs) -> Term:
        self.all_terms.append(result := super().mkBoolean(*args, **kwargs))
        return result

    def mkVar(self, *args, **kwargs) -> Term:
        self.all_vars.append(result := super().mkVar(*args, **kwargs))
        return result

    def mk_tfu(self, which: str) -> Term:
        if self.tfu_cache is None:
            self.tfu_cache = {
                which: self.mkTerm(Kind.APPLY_CONSTRUCTOR,
                                   self.tfu.getConstructor(f"tfu_{which}").getTerm())
                for which in ["true", "false", "true_or_false"]
            }
        return self.tfu_cache[which]

    def mk_tfu_true(self) -> Term:          return self.mk_tfu("true")
    def mk_tfu_false(self) -> Term:         return self.mk_tfu("false")
    def mk_tfu_true_or_false(self) -> Term: return self.mk_tfu("true_or_false")

    # def mk_opt_real(self, which: str,
    #                 value: Optional[Union[float, Term]]= None) -> Term:
    #     if which == "known":
    #         args = [self.mkReal(value)] if isinstance(value, float) else [value]
    #     else:
    #         args = []
    #     logger.info("in mk_opt_real, args %s %s", args, [type(x) for x in args])
    #     rv = self.mkTerm(Kind.APPLY_CONSTRUCTOR,
    #                      self.opt_real.getConstructor(which).getTerm(),
    #                      *args)
    #     logger.info("mk_opt_real -> %s", rv)
    #     return rv

    # def mk_opt_real_known(self, x: float) -> Term:
    #     return self.mk_opt_real("known", x)

    # def mk_opt_real_unknown(self) -> Term:
    #     return self.mk_opt_real("unknown")

    def find_by_name(self, func_name: str) -> Function:
        for func in self.all_functions:
            if func.name == func_name:
                return func
        raise Exception(f"unknown function: {func_name}")

    def sexpr_str_to_term(self, sexpr_str: str) -> Term:
        """
        >>> s = Solver()
        >>> _facts = s.generate_facts()
        >>> s.sexpr_str_to_term("42")
        42

        >>> s.sexpr_str_to_term("(= 42 43)")
        (= 42 43)

        >>> t = s.sexpr_str_to_term("(and " +
        ...                     "(= (heart-rate 13180) 60.0) " +
        ...                     "(forall ((t Int)) (=> (> t 13180) " +
        ...                     "(not (exists ((hr FP)) (= (heart-rate t) hr))))))")
        >>> print(normalize_ws(pprint_term(t)))
        (and (= (heart-rate 13180) 60.0) (forall ((t Int)) (=> (> t 13180) (not (exists ((hr FP)) (= (heart-rate t) hr))))))
        """
        # print(f"sexpr_str_to_term {sexpr_str}")
        sexpr = parse_sexpr_from_str(sexpr_str)
        print(f"sexpr {sexpr}")
        return self.sexpr_to_term(sexpr)

    def sexpr_to_term(self, sexpr, variables: List[Term] = None) -> Term:
        """
        variables are introduced by quantifiers and are added on the end of the list.
        So, the most recent variables are last.

        >>> s = Solver()
        >>> s.sexpr_to_term(42)
        42
        >>> s.sexpr_to_term(["=", 42, 43])
        (= 42 43)
        """
        # logger.info("sexpr_to_term %s %s vars %s", sexpr, type(sexpr), variables)
        if variables is None:
            variables = []
        # logger.debug("all_functions: %s", self.all_functions)
        funcs_hash = {f.name: f for f in self.all_functions}
        # logger.debug("funcs_hash: %s", funcs_hash)
        if not isinstance(sexpr, list) and sexpr in funcs_hash: # is a constant, a 0-arity function
            func_term = funcs_hash[sexpr].cvc5_const
            rv = func_term
        elif isinstance(sexpr, list) and sexpr[0] in funcs_hash:
            func_term = funcs_hash[sexpr[0]].cvc5_const
            children = [self.sexpr_to_term(c, variables) for c in sexpr[1:]]
            rv = self.mkTerm(Kind.APPLY_UF, func_term, *children)
        elif isinstance(sexpr, list):
            kind = SUPPORTED_KINDS[sexpr[0].lower()]
            if kind in {Kind.FORALL, Kind.EXISTS}:
                def mk_var(name: str, type_str: str) -> Term:
                    if type_str == "Int":
                        sort = self.getIntegerSort()
                    elif type_str == "FP":
                        sort = self.fp64_sort
                    else:
                        raise Exception(f"port me {name} {type_str}")
                    return self.mkVar(sort, name)
                new_variables = [mk_var(*var) for var in sexpr[1]]
                # logger.debug("new_variables %s types %s", new_variables, [type(v) for v in new_variables])
                body = self.sexpr_to_term(sexpr[2], variables + new_variables)
                rv = self.mkTerm(kind, self.mkTerm(Kind.VARIABLE_LIST, *new_variables),
                                 body)
            else:
                children = [self.sexpr_to_term(c, variables) for c in sexpr[1:]]
                # logger.info("children: %s %s", children, [type(c) for c in children])
                # logger.info("child kinds %s", [c.getKind() for c in children])
                # logger.info("sorts %s", [c.getSort() for c in children])
                # logger.info("kind: %s", kind)
                if kind == Kind.EQUAL:
                    # make sure that Reals are Reals and Ints are Ints
                    if (children[0].getKind() == Kind.CONST_INTEGER and  # arg0 is literal int
                        children[0].getSort() == self.getIntegerSort() and
                        children[1].getKind() == Kind.CONSTANT and       # arg1 is (0-arity) function
                        children[1].getSort() == self.fp64_sort):
                       logger.info("coercing integer constant to real for %s", children[1])
                       children[0] = self.mkReal(float(children[0].getIntegerValue()))
                    if (children[0].getKind() == Kind.CONSTANT and       # arg0 is (0-arity) function
                        children[0].getSort() == self.fp64_sort and 
                        children[1].getKind() == Kind.CONST_INTEGER and # arg1 is literal int
                        children[1].getSort() == self.getIntegerSort()): 
                       logger.info("coercing integer constant to real for %s", children[0])
                       children[1] = self.mkReal(float(children[1].getIntegerValue()))
                # logger.info("children: %s %s", children, [type(c) for c in children])
                # logger.info("sorts %s", [c.getSort() for c in children])
                rv = self.mkTerm(kind, *children)
        else:
            try:
                rv = self.convert_literal_to_term(sexpr, variables)
            except Exception as ex:
                print(ex)
                raise Exception(f"Couldn't understand <{sexpr}>") from ex
        # logger.info("sexpr_to_term %s -> %s (%s)", sexpr, rv, rv.getKind())
        return rv


    def convert_literal_to_term(self, *args, **kwargs) -> Term:
        # logger.info("convert_literal_to_term %s", args[0])
        rv = self._convert_literal_to_term(*args, **kwargs)
        # logger.info("convert_literal_to_term %s -> %s (%s)", args[0], rv, type(rv))
        return rv

    def _convert_literal_to_term(self, x,
                                 variables: list = None, # List[Function]
                                 known_sort: Optional[Sort] = None) -> Term:

        """
        variables are introduced by quantifiers and are added on the end of the list.
        """
        if variables is None:
            variables = []
        # logger.info(f"_convert_literal_to_term {x} {type(x)} vars {' '.join([str(v) for v in variables])} known_sort {known_sort}")
        if variables is None:
            variables = []
        if isinstance(x, str) and x == "tfu_true":
            return self.mk_tfu_true()
        if isinstance(x, str) and x == "tfu_false":
            return self.mk_tfu_false()
        if isinstance(x, str) and x == "tfu_true_or_false":
            return self.mk_tfu_true_or_false()
        if isinstance(x, str) and x == "true":
            return self.mkBoolean(True)
        if isinstance(x, str) and x == "false":
            return self.mkBoolean(False)
        if isinstance(x, str) and x.lower() == "nan":
            return self.mkNaN()
        for variable in reversed(variables):
            if variable.getSymbol() == str(x):
                return variable
        for function in self.all_functions:
            if function.name == str(x) and len(function.args) == 1:
                return function.cvc5_const
        if known_sort:
            if known_sort.isInteger():
                return self.mkInteger(int(x))
            # elif known_sort.isReal():
            #     return self.mkReal(float(x))
            elif known_sort == self.fp64_sort:
                return self.mkFp64(float(x))
            elif known_sort.isString():
                return self.mkString(str(x))
            else:
                if isinstance(x, Term):
                    return x
                else:
                    raise Exception("_convert_literal_to_term: port me! "
                                    f"{known_sort} {type(known_sort)}")
        else:
            # cvc5 is finicky about types, so preferentially cast to float
            try:
                return self.mkFp64(float(x)) if "." in str(x) else self.mkInteger(int(x))
            except:
                try:
                    return self.mkString(str(x))
                except:
                    pass
            raise Exception(f"_convert_literal_to_term: port me! {type(x)} {x}")

    def _and_or(self, kind: Kind, *child_terms: List[Term]) -> Term:
        """
        Conjunctions in cvc5 must have at least two conjuncts.
        """
        child_terms = list(child_terms)
        assert all(isinstance(x, Term) for x in child_terms)
        # print(f"and/or {[f"{type(term)} {term}" for term in child_terms]}")
        if len(child_terms) == 0:
            rv = self.mkBoolean(True) if "and" in str(kind).lower() else \
                 self.mkBoolean(False)
        elif len(child_terms) == 1:
            rv = child_terms[0]
        else:
            rv = self.mkTerm(kind, *child_terms)
        # print(f"and/or -> {type(rv)} {rv}")
        return rv

    def and_(self, *not_defined: List[Term]) -> Term:
        """
        Conjunctions in cvc5 must have at least two conjuncts.
        """
        return self._and_or(Kind.AND, *not_defined)

    def or_(self, *disjunct_terms: List[Term]) -> Term:
        """
        Not sure if disjunctions can have one arg, but simplify anyway.
        """
        return self._and_or(Kind.OR, *disjunct_terms)

    def equal(self, term1: Term, term2: Term) -> Term:
        # print(f"equal {type(term1)} {term1} {type(term2)} {term2}")
        assert isinstance(term1, Term) and isinstance(term2, Term)
        rv = self.mkTerm(Kind.EQUAL, term1, term2)
        # print(f"equal -> {type(rv)} {rv}")
        return rv

    def equal_fp(self, term1: Term, term2: Term) -> Term:
        # print(f"equal {type(term1)} {term1} {type(term2)} {term2}")
        assert isinstance(term1, Term) and isinstance(term2, Term)
        rv = self.mkTerm(Kind.FLOATINGPOINT_EQ, term1, term2)
        # print(f"equal -> {type(rv)} {rv}")
        return rv

    def implies(self, term1: Term, term2: Term) -> Term:
        # print(f"implies {type(term1)} {term1} {type(term2)} {term2}")
        assert isinstance(term1, Term) and isinstance(term2, Term)
        rv = self.mkTerm(Kind.IMPLIES, term1, term2)
        # print(f"implies -> {type(rv)} {rv}")
        return rv

    def lt(self, term1: Term, term2: Term) -> Term:
        # print(f"lt {type(term1)} {term1} {type(term2)} {term2}")
        assert isinstance(term1, Term) and isinstance(term2, Term)
        rv = self.mkTerm(Kind.LT, term1, term2)
        # print(f"lt -> {type(rv)} {rv}")
        return rv

    def lt_fp(self, term1: Term, term2: Term) -> Term:
        # print(f"lt {type(term1)} {term1} {type(term2)} {term2}")
        assert isinstance(term1, Term) and isinstance(term2, Term)
        rv = self.mkTerm(Kind.FLOATINGPOINT_LT, term1, term2)
        # print(f"lt -> {type(rv)} {rv}")
        return rv

    def geq(self, term1: Term, term2: Term) -> Term:
        # print(f"geq {type(term1)} {term1} {type(term2)} {term2}")
        assert isinstance(term1, Term) and isinstance(term2, Term)
        rv = self.mkTerm(Kind.GEQ, term1, term2)
        # print(f"geq -> {type(rv)} {rv}")
        return rv

    def geq_fp(self, term1: Term, term2: Term) -> Term:
        # print(f"geq {type(term1)} {term1} {type(term2)} {term2}")
        assert isinstance(term1, Term) and isinstance(term2, Term)
        rv = self.mkTerm(Kind.FLOATINGPOINT_GEQ, term1, term2)
        # print(f"geq -> {type(rv)} {rv}")
        return rv

    def not_(self, term: Term) -> Term:
        assert isinstance(term, Term)
        # print(f"not {type(term)} {term}")
        rv = self.mkTerm(Kind.NOT, term)
        # print(f"not -> {type(rv)} {rv}")
        return rv

    def forall(self,
               variables: List[Term],
               body: Term,
               pattern_list: Optional[Term] = None) -> Term:
        extra_args = [pattern_list] if pattern_list is not None else []
        rv = self.mkTerm(Kind.FORALL,
                    self.mkTerm(Kind.VARIABLE_LIST, *variables),
                    body,
                    *extra_args)
        return rv

    def exists(self,
               variables: List[Term],
               body: Term,
               pattern_list: Optional[Term] = None) -> Term:
        extra_args = [pattern_list] if pattern_list is not None else []
        rv = self.mkTerm(Kind.EXISTS,
                    self.mkTerm(Kind.VARIABLE_LIST, *variables),
                    body,
                    *extra_args)
        return rv

    def apply(self,
              func_const: Union[Term, Function],
              formal_args: List[Term]) -> Term:
        # print(f"apply {func_const} formal_args {formal_args} {list(map(type, formal_args))}")
        if isinstance(func_const, Function):
            func_const = func_const.cvc5_const
        rv = self.mkTerm(Kind.APPLY_UF, func_const, *formal_args)
        # print(f"apply -> {rv}")
        return rv

    def generate_all_axioms(self, facts: list):
        """
        facts is a List[Fact]
        """
        results = []
        for function in self.all_functions:
            results.extend(function.generate_core_axioms(facts))
            results.extend(function.generate_CWA_axioms(facts))
        return results

    def convert_facts_to_natural_language(self, facts: list) -> List[str]:
        """
        facts is a List[Fact]
        """
        return [f.as_natural_language() for f in facts]

    def generate_facts(self):
        _birth_date: int = convert_date_to_epochal("1950-1-1")
        today = int(datetime.datetime.now().timestamp() / (60*60*24))

        name_function = Function(self, "name", return_sort=self.getStringSort(),
                                 return_units=None)
        birth_date_function = Function(
                                self, "birth-date",
                                return_sort=self.getIntegerSort(),
                                return_units=("Unix epochal day", "Unix epochal days"))
        age_function = Function(self, "age",
                                return_sort=self.fp64_sort,
                                return_units=("year", "years"))
        heart_rate_function = Function(self, "heart-rate",
                                return_sort=self.fp64_sort,
                                return_units=("beat/sec", "beats/sec"),
                                args=[("time", self.getIntegerSort())])
        weight_function = Function(self, "weight",
                                return_sort=self.fp64_sort,
                                return_units=("pound", "pounds"),
                                args=[("time", self.getIntegerSort())])
        diagnosis_function = InterpolatableFunction(
                                self, "D",
                                return_sort=self.tfu_sort,
                                return_units=None,
                                args=[("ICD", self.getStringSort()),
                                      ("time", self.getIntegerSort())])

        return [
            Fact(name_function, "Joe Bloggs"),
            Fact(birth_date_function, _birth_date),
            Fact(age_function, (today - _birth_date)/365),
            Fact(heart_rate_function, 55.0,
                 convert_date_to_epochal("2005-02-01")),
            Fact(heart_rate_function, 60.0,
                 convert_date_to_epochal("2006-02-01")),
            Fact(weight_function, 150.0,
                 convert_date_to_epochal("2005-02-01")),
            Fact(weight_function, 155.0,
                 convert_date_to_epochal("2006-02-01")),
            Fact(diagnosis_function, self.mk_tfu_true(),
                     "E11", diagnosis_date1),
            Fact(diagnosis_function, self.mk_tfu_false(),
                     "E11", diagnosis_date2),
            Fact(diagnosis_function, self.mk_tfu_true(),
                     "E11", diagnosis_date3),
        ]

@contextmanager
def solver():
    tmp_solver = Solver()
    yield tmp_solver

def show_info_about_result(s: Solver, this_result: Result):
    logger.info("checkSat -> %s", this_result)
    # print("Getting timeout core")
    # tc_result, formulas = s.getTimeoutCore()
    # print(f"timeout core:{tc_result}\nFormulas:")
    # for f in formulas:
    #     pprint_term(f)
    # print("=======================")
    if this_result.isUnsat():
        logger.info("Getting unsat core")
        unsat_core = s.getUnsatCore()
        logger.info("\nUnsat core:")
        for term in unsat_core:
            logger.info("Unsat core> %s", pprint_term(term))
            logger.info(dump_term(term))
        logger.info("unsat core=======================")
    if this_result.isSat():
        logger.info("Getting model")
        m = s.getModel(sorts=[], consts=[])
        logger.info(m)
    logger.info("Asserts according to the solver:")
    for assertion in s.getAssertions():
        logger.info(assertion)
        logger.info(pprint_term(assertion))


def create_solver_and_check_sat(test_statement_str: str) -> Optional[bool]:
    """
    Note that the facts are baked into the Solver. To use a different set of
    facts, create a subclass of Solver.
    """
    logger.info("create_solver_and_check_sat %s", test_statement_str)
    assert test_statement_str
    s = Solver()

    facts = s.generate_facts()
    logger.info("facts:")
    for f in facts:
        logger.info(f.as_natural_language())
    logger.info("====================")

    axioms = s.generate_all_axioms(facts)
    logger.info("all axioms:")
    for axiom in axioms:
        logger.info(pprint_term(axiom, 0))
    logger.info("====================\n")

    test_stmt = s.sexpr_str_to_term(test_statement_str)
    logger.info(f"Test statement:\n{pprint_term(test_stmt)})")

    for stmt in axioms + [test_stmt]:
        logger.info("(assert %s", pprint_term(stmt, indent=2))
        s.assertFormula(stmt)

    logger.info("checking sat")
    this_result = s.checkSat()
    show_info_about_result(s, this_result)
    logger.info(f"create_solver_and_check_sat {test_statement_str} -> {this_result}")
    # Python seems not to be GCing `all_functions` correctly.
    # this line prevents a SEGFAULT:
    s.all_functions = None
    s.all_vars = None
    s.all_terms = None
    logger.info("Cleared out all_functions, vars, and terms")
    return this_result

def check_statement_validity(logical_stmt_str: str) -> Tuple[str, Result, Result]:
    """
    In here we take care of the query and negated query
    and combining the results.

    Result is 
    1) one of "true", "false", "unknown". This is just a kludgey way of doing
       three-way logic.
    2) the cvc5.Result object for the original query
    3) the cvc5.Result object for the negated query
    """
    logger.info(f"check_statement_validity {logical_stmt_str}")
    orig_result = create_solver_and_check_sat(logical_stmt_str)
    logger.info(f"orig_result: {orig_result}")
    negated_result = create_solver_and_check_sat(f"(not {logical_stmt_str})")
    logger.info(f"orig_result: {orig_result} negated_result: {negated_result}")
    if negated_result.isUnsat():
        # we trust an unsat result more than a sat result
        rv = "true"
    elif orig_result.isUnsat():
        rv = "false"
    elif orig_result.isSat():
        rv = "true"
    elif negated_result.isSat():
        rv = "false"
    else:
        rv = "unknown"
    logger.info(f"check_statement_validity {logical_stmt_str} -> {rv}")
    return rv, orig_result, negated_result

def check_stmt_job(which: str, logical_stmt_str: str, queue: Queue):
    logger.info(f"check_{which}_stmt {logical_stmt_str}, pid {os.getpid()}: ")
    try:
        result = create_solver_and_check_sat(logical_stmt_str)
        logger.info(f"{which}>result: {result}")
        queue.put((os.getpid(), which, str(result).lower())) # result isn't pickleable
        logger.info("added to q")
    except Exception as ex:
        queue.put((os.getpid(), f"Error in {which} child: {ex}"))


def check_statement_validity_in_parallel(logical_stmt_str: str) -> str:
    """
    In here we take care of the query and negated query
    and combining the results.

    Result is one of "true", "false", "unknown". This is just a kludgey
    way of doing three-way logic.
    """
    result_q = Queue()
    p1 = Process(target=check_stmt_job, args=("orig", logical_stmt_str, result_q))
    p2 = Process(target=check_stmt_job, args=("negated", f"(not {logical_stmt_str})", result_q))

    # Start the child processes.
    print("Parent process starting children...")
    p1.start()
    p2.start()
    print("Parent process waiting for the first child to finish...")
    first_result = result_q.get()
    finished_pid, which, result = first_result
    print(f"\nParent received a result from PID {finished_pid}:\n  {first_result}")

    # Determine which process finished and which one is still running.
    print(f"Child {which} (pid {finished_pid}) finished first with result {result}")
    running_process = p2 if finished_pid == p1.pid else p1

    # Terminate the other process if it is still active.
    print(f"Terminating the other child process (PID: {running_process.pid})...")
    if running_process.is_alive():
        running_process.terminate()
        running_process.join()  # Wait for the process to fully terminate.
        print(f"Process {running_process.pid} has been terminated.")
    else:
        print(f"Process {running_process.pid} has already finished.")

    print(f"finished pid {finished_pid} p1 {p1} p2{p2}")
    if finished_pid == p2.pid:
        print("negated solver finished first")
        if result == "unsat":
            rv = "true"
        elif result == "sat":
            rv = "false"
        else:
            rv = "unknown"
    else:
        print("orig solver finished first")
        if result == "unsat":
            rv = "false"
        elif result == "sat":
            rv = "true"
        else:
            rv = "unknown"
    print(f"check_statement_validity_in_parallel {logical_stmt_str} -> {rv}")
    return rv

# diagnosis_date1 is True
# diagnosis_date2 is False
# delta is midway between them
delta = int(abs(diagnosis_date2 - diagnosis_date1)/2)
logger.debug("diagnosis_date1 %s", diagnosis_date1)
logger.debug("diagnosis_date2 %s", diagnosis_date2)
logger.debug("delta %s", delta)

def test_diagnosis():
    """
    There is one diagnosis of True on diagnosis_date1
    And another of False on diagnosis_date2
    """
    for idx, (date_, value, expected_validity) in enumerate([
        (diagnosis_date1 - delta, "tfu_true",          "false"),
        (diagnosis_date1 - delta, "tfu_false",         "false"),
        (diagnosis_date1 - delta, "tfu_true_or_false", "true"),
        (diagnosis_date1,         "tfu_true",          "true"),
        (diagnosis_date1,         "tfu_false",         "false"),
        (diagnosis_date1,         "tfu_true_or_false", "false"),
        (diagnosis_date1 + delta, "tfu_true",          "true"),
        (diagnosis_date1 + delta, "tfu_false",         "false"),
        (diagnosis_date1 + delta, "tfu_true_or_false", "false"),
        (diagnosis_date2,         "tfu_true",          "false"),
        (diagnosis_date2,         "tfu_false",         "true"),
        (diagnosis_date2,         "tfu_true_or_false", "false"),
        (diagnosis_date2 + delta, "tfu_true",          "false"),
        (diagnosis_date2 + delta, "tfu_false",         "true"),
        (diagnosis_date2 + delta, "tfu_true_or_false", "false"),
        (diagnosis_date3,         "tfu_true",          "true"),
        (diagnosis_date3,         "tfu_false",         "false"),
        (diagnosis_date3,         "tfu_true_or_false", "false"),
        (diagnosis_date3 + delta, "tfu_true",          "true"),
        (diagnosis_date3 + delta, "tfu_false",         "false"),
        (diagnosis_date3 + delta, "tfu_true_or_false", "false"),
        ]):
        print(">>>", date_, value, expected_validity)
        test_stmt = f'(= (D "E11" {date_}) {value})'
        valid = check_statement_validity(test_stmt)
        print(f"#{idx:,}: valid: {valid}")
        assert valid == expected_validity, (date_, value, expected_validity)


def test_sexpr_str_to_term():
    s = Solver()
    _facts = s.generate_facts() # as a side-effect, generate Functions
    for sexpr_str, expected in [(dedent("""\
        (and
            (= (heart-rate 13180) 60.0)
            (forall ((t Int))
                (=> (> t 13180)
                    (not (exists ((hr FP))
                            (and (not (= hr NaN))
                                 (= (heart-rate t) hr))
                         )))))"""), None),
        ("(= age 72)", "(= age 72.0)")]:
        term = s.sexpr_str_to_term(sexpr_str)
        print(f"term: {term}")
        term_str = normalize_ws(pprint_term(term))
        sexpr_str = normalize_ws(sexpr_str)
        expected = expected or sexpr_str
        print(f"Got:      {term_str}")
        print(f"Expected: {expected}")
        assert str(term_str) == expected

    s.all_functions = None
    s.all_terms = None


def test_solver_segfault():
    """ Call this multiple times to see if we can get a SEGFAULT. """
    result = check_statement_validity("(> age 40.0)")
    print(result)


if __name__ == "__main__":
    # valid = check_statement_validity("(= age 75.8547945)")
    # valid = check_statement_validity("(= age 75.8547945)")
    # valid = check_statement_validity("(exists ((time Int)) (> (heart-rate time) 100.0))")

    # valid = create_solver_and_check_sat("(exists ((time Int)) (and (not (= (heart-rate time) NaN)) (> (heart-rate time) 100.0)))")
    # assert valid.isUnsat(), valid


    valid = create_solver_and_check_sat("(exists ((time Int)) (> (heart-rate time) 100.0))")
    assert valid.isUnsat(), valid

    valid = create_solver_and_check_sat("(not (exists ((time Int)) (< (heart-rate time) 100.0)))")
    assert valid.isUnsat(), valid

    valid = create_solver_and_check_sat("(not (exists ((time Int)) (> (heart-rate time) 10.0)))")
    assert valid.isUnsat(), valid

    valid = create_solver_and_check_sat("(exists ((time Int)) (< (heart-rate time) 10.0))")
    assert valid.isUnsat(), valid

    # valid = create_solver_and_check_sat("(> (heart-rate 12815) 100.0)")
    # assert valid.isUnsat(), valid

    # valid = create_solver_and_check_sat("(> (heart-rate 12816) 100.0)")
    # assert valid.isUnsat(), valid

    # valid = check_statement_validity("(> 150.0 100.0)")

    # valid = create_solver_and_check_sat("(< (heart-rate 12815) 100.0)") # Sat
    # assert valid.isSat(), valid
    # valid = create_solver_and_check_sat("(> (heart-rate 12815) 100.0)") # Unsat
    # assert valid.isUnsat(), valid
    # valid = create_solver_and_check_sat("(< (heart-rate 12815) 10.0)") # Unsat
    # assert valid.isUnsat(), valid
    # valid = create_solver_and_check_sat("(> (heart-rate 12815) 10.0)") # Sat
    # assert valid.isSat(), valid

    # with solver() as s:
    #     X = s.mkConst(s.fp64_sort, "X")
    #     s.assertFormula(s.equal(X, double_to_fp64(s, 42.0)))
    #     s.assertFormula(s.lt(X, double_to_fp64(s, 10.0)))
    #     # for sexpr in ["(= X 42.0)", "(> X 50.0)"]:
    #     #     term = s.sexpr_str_to_term(sexpr)
    #     #     print(f"term {pprint_term(term)}")
    #     #     s.assertFormula(term)
    #     result = s.checkSat()
    #     print(f"result: {result}")

    # with solver() as s:
    #     X = s.mkConst(s.fp64_sort, "X")
    #     hr_sort = s.mkFunctionSort([s.getIntegerSort()], s.fp64_sort)
    #     hr = s.mkConst(hr_sort, "hr")
    #     s.assertFormula(s.equal(s.apply(hr, [s.mkInteger(10)]),
    #                             double_to_fp64(s, 42.0)))
    #     s.assertFormula(s.lt(s.apply(hr, [s.mkInteger(10)]),
    #                          double_to_fp64(s, 10.0)))
    #     # for sexpr in ["(= X 42.0)", "(> X 50.0)"]:
    #     #     term = s.sexpr_str_to_term(sexpr)
    #     #     print(f"term {pprint_term(term)}")
    #     #     s.assertFormula(term)
    #     result = s.checkSat()
    #     print(f"result: {result}")    # test_sexpr_str_to_term()
    #     show_info_about_result(s, result)

    # test_solver_segfault()
    # test_solver_segfault()
    # with solver() as s:
    #     _ = s.generate_facts()
    #     sexpr = dedent("""\
    #         (and
    #             (= (heart-rate 13180) 60.0)
    #             (forall ((t Int))
    #                 (=> (> t 13180)
    #                     (not (exists ((hr FP))
    #                             (and (= (heart-rate t) hr)
    #                                  (not (= hr NaN)))
    #                           ))
    #                 )))""")
    #     # sexpr = "(= (heart-rate 13180) 60.0)"
    #     # sexpr = "(= (heart-rate 13180) NaN)"
    #     t = s.sexpr_str_to_term(sexpr)
    #     print(f"term: {t}")
    #     print(f"pprint: {pprint_term(t, indent=8)}")
    print("Finished")
 