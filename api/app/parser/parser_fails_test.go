package parser

import (
	"strings"
	"testing"
)

func TestCalculatorFailure_TableDriven(t *testing.T) {
	// 1. Table structure definition for error scenarios
	tests := []struct {
		name        string
		expression  string
		expectedErr string // The exact text or fragment that the error must contain
	}{
		// --- Tokenization Phase Errors (tokenize) ---
		{
			name:        "invalid character",
			expression:  "2+3a",
			expectedErr: "Syntax Error: Invalid Character a",
		},
		{
			name:        "multiple decimal points",
			expression:  "2.5.5+3",
			expectedErr: "Syntax Error: multiple decimal points in number",
		},
		{
			name:        "two consecutive operators",
			expression:  "5++3",
			expectedErr: "Syntax Error: two operators in a row",
		},
		{
			name:        "consecutive operators with subtraction",
			expression:  "5+-3", // Detects '+' followed immediately by another invalid operator
			expectedErr: "Syntax Error: two operators in a row",
		},
		{
			name:        "orphan negative sign without a consecutive number",
			expression:  "-*3", // The '-' is not followed by a digit or decimal point at the start
			expectedErr: "Syntax Error: two operators in a row",
		},

		// --- RPN Conversion Phase Errors (parseToRpn) ---
		{
			name:        "closing parenthesis without opening",
			expression:  "2+3)",
			expectedErr: "Syntax Error: Mismatched Parentheses",
		},
		{
			name:        "opening parenthesis without closing",
			expression:  "(2+3",
			expectedErr: "Syntax Error: Mismatched Parentheses",
		},
		{
			name:        "empty or complex mismatched parentheses",
			expression:  "((2+3)",
			expectedErr: "Syntax Error: Mismatched Parentheses",
		},

		// --- Evaluation Phase Errors (evaluateRpn) ---
		{
			name:        "division by zero",
			expression:  "10/0",
			expectedErr: "Math Error: Division by zero",
		},
		{
			name:        "insufficient operands at start",
			expression:  "+2", // Converts to RPN but misses the first operand
			expectedErr: "Syntax Error: Not enough operands for operator +",
		},
		{
			name:        "insufficient operands at end",
			expression:  "2+", // Tokenizer accepts '+', RPN stacks it, but evaluate runs out of operands
			expectedErr: "Syntax Error: Not enough operands for operator +",
		},
		{
			name:        "incomplete expression leaving elements on the stack",
			expression:  "(2+3)4", // RPN evaluates (2+3)->5 and then processes 4 in isolation without an operator
			expectedErr: "Syntax Error: Invalid expression",
		},
	}

	// 2. Subtest execution
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := CalculateExpression(tt.expression)

			// A failure test MUST return an error
			if err == nil {
				t.Fatalf("expected an error for %q, but the expression was calculated successfully", tt.expression)
			}

			// Validate that the error message contains the expected substring
			if !strings.Contains(err.Error(), tt.expectedErr) {
				t.Errorf("got error = %q, expected to contain = %q", err.Error(), tt.expectedErr)
			}
		})
	}
}
