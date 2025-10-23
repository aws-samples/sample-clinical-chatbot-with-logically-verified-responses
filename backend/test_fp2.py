from cvc5 import Solver, SortKind, Kind
import sys

# Instantiate a cvc5 Solver object.
solver = Solver()

# Define the floating-point sort, for example, a 32-bit single-precision float.
# It has 8 exponent bits and 24 significand bits (including the hidden bit).
fp32_sort = solver.mkFloatingPointSort(8, 24)

# Create a floating-point literal for the value 2.5
# The mkFloatingPoint method takes three arguments for creating a literal:
# 1. The sort for the floating-point number.
# 2. A floating-point number in Python's built-in float type.
# 3. The sort again (or you can use the more specific method below).
# For more precision, you can also use a string representation.

# Create the Term for 2.5 using a Python float
two_point_five = solver.mkFloatingPoint(fp32_sort, 2.5)

# Verify the kind of the created term.
if two_point_five.getKind() == Kind.CONST_FLOATINGPOINT:
    print(f"Successfully created a floating-point literal: {two_point_five}")
else:
    print("Failed to create a CONST_FLOATINGPOINT term.")
    sys.exit()

# You can also create a literal directly from its components (sign, exponent, significand),
# but this is more complex and typically not needed for simple literals.
