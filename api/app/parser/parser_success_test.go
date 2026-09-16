package parser

import (
	"math"
	"testing"
)

func TestCalculatorSuccess_TableDriven(t *testing.T) {
	// Define a small tolerance value (epsilon) for float64 comparisons
	const epsilon = 1e-9

	// 1. Define the test cases
	tests := []struct {
		name      string
		operation string
		expected  float64
	}{
		// --- Basic Addition and Subtraction ---
		{"addition1", "2+3", 5},
		{"addition2", "48+50", 98},
		{"subtraction1", "10-5", 5},
		{"subtraction_to_negative", "0-5", -5},

		// --- Multiplication and Division ---
		{"multiplication", "4*5", 20},
		{"division_exact", "10/2", 5},
		{"division_decimal", "5/2", 2.5},

		// --- Decimals & Floating-Point Operations ---
		{"decimal_addition", "2.5+3.1", 5.6},
		{"decimal_multiplication", "1.5*2.5", 3.75},
		{"decimal_subtraction", "5.75-2.25", 3.5},
		{"decimal_division", "7.5/1.5", 5},

		// --- Negative Numbers & Inline Negation ---
		{"negative_number", "-5+3", -2},
		{"negative_result", "3-5", -2},
		{"negative_multiplication", "-4*2", -8},
		{"negative_division", "-2/4", -0.5},
		{"negation_inside_parentheses", "(3-5)*4", -8},

		// --- PEMDAS Precedence (Without Parentheses) ---
		{"multiplication_before_addition", "2+3*4", 14}, // 3*4 = 12 -> 2+12 = 14
		{"division_before_subtraction", "10-6/2", 7},    // 6/2 = 3  -> 10-3 = 7
		{"left_to_right_associativity", "10-3+2", 9},    // 10-3 = 7 -> 7+2 = 9
		{"left_to_right_division_mult", "12/3*2", 8},    // 12/3 = 4 -> 4*2 = 8

		// --- Parentheses Handling (Priority Overrides) ---
		{"parentheses_forcing_addition", "(2+3)*4", 20}, // (5)*4 = 20
		{"nested_parentheses", "3*((4+2)/2)", 9},        // 3*(6/2) -> 3*3 = 9
		{"complex_pemdas", "5+((2+3)*4-2)/2", 14},       // 5 + (5*4 - 2)/2 -> 5 + 18/2 -> 5 + 9 = 14

		// --- Spaces & Formatting Edge Cases ---
		{"spaces_around_operators", "2 + 3 * 4", 14},
		{"spaces_with_decimals", " 2.5 *  4 ", 10},
	}

	// 2. Iterate and run subtests
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := CalculateExpression(tt.operation)
			if err != nil {
				t.Fatalf("failed %s: unexpected error occurred - %v", tt.name, err)
			}

			// Note: Using math.Abs for float comparison to prevent precision error failures
			if math.Abs(result-tt.expected) > epsilon {
				t.Errorf("failed %s: expected %g, got %g", tt.name, tt.expected, result)
			}
		})
	}
}
