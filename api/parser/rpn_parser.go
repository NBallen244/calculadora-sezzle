package parser

import (
	"fmt"
	"strconv"
	"unicode"
)

type TokenType int

const (
	TokenNumber   TokenType = iota //0
	TokenOperator                  //1
	TokenLParen                    //2
	TokenRParen                    //3
)

type Token struct {
	Type  TokenType
	Value string
}

// Operator precendence map according to standard mathematical rules
var precedence = map[string]int{
	"+": 1,
	"-": 1,
	"*": 2,
	"/": 2,
}

// tokenize converts a string expression into a list of tokens.
func tokenize(expression string) ([]Token, error) {
	var tokens []Token
	var characs = []rune(expression)
	var previousType TokenType = -1
	for i := 0; i < len(characs); {
		char := characs[i]
		// Skip whitespace
		if unicode.IsSpace(char) {
			i++
			continue
		}
		if unicode.IsDigit(char) || char == '.' {
			start := i
			isDecimal := false
			for i < len(characs) && (unicode.IsDigit(characs[i]) || characs[i] == '.') {
				if characs[i] == '.' {
					if isDecimal {
						return nil, fmt.Errorf("Syntax Error: multiple decimal points in number")
					}
					isDecimal = true
				}
				i++
			}
			tokens = append(tokens, Token{Type: TokenNumber, Value: string(characs[start:i])})
			previousType = TokenNumber
			continue
		} else if char == '(' {
			tokens = append(tokens, Token{Type: TokenLParen, Value: string(char)})
			previousType = TokenLParen
			i++
		} else if char == ')' {
			tokens = append(tokens, Token{Type: TokenRParen, Value: string(char)})
			previousType = TokenRParen
			i++
		} else if char == '+' || char == '-' || char == '*' || char == '/' {
			if previousType == TokenOperator {
				return nil, fmt.Errorf("Syntax Error: two operators in a row")
			}
			if char == '-' && (previousType == -1 || previousType == TokenLParen) {
				// This is a posible negative number
				if i+1 < len(characs) && (unicode.IsDigit(characs[i+1]) || characs[i+1] == '.') {
					start := i
					isDecimal := false
					i++ // Skip the negative sign
					for i < len(characs) && (unicode.IsDigit(characs[i]) || characs[i] == '.') {
						if characs[i] == '.' {
							if isDecimal {
								return nil, fmt.Errorf("Syntax Error: multiple decimal points in number")
							}
							isDecimal = true
						}
						i++
					}
					tokens = append(tokens, Token{Type: TokenNumber, Value: string(characs[start:i])})
					previousType = TokenNumber
					continue
				}
			}
			tokens = append(tokens, Token{Type: TokenOperator, Value: string(char)})
			previousType = TokenOperator
			i++
		} else {
			return nil, fmt.Errorf("Syntax Error: Invalid Character %c", char)
		}
	}
	return tokens, nil
}

// parseToRpn converts a list of tokens in infix notation to Reverse Polish Notation (RPN) using the Shunting Yard algorithm.
func parseToRpn(tokens []Token) ([]Token, error) {
	var output []Token
	var stack []Token
	for _, token := range tokens {
		switch token.Type {
		//Numbers go directly to the output stack
		case TokenNumber:
			output = append(output, token)
		case TokenOperator:
			// While there is an operator at the top of the stack with greater than or equal precedence, pop operators from the stack to the output.
			for len(stack) > 0 && stack[len(stack)-1].Type == TokenOperator && precedence[stack[len(stack)-1].Value] >= precedence[token.Value] {
				output = append(output, stack[len(stack)-1])
				stack = stack[:len(stack)-1]
			}
			//Then add it to the stack
			stack = append(stack, token)
		case TokenLParen:
			//Add to operator stack
			stack = append(stack, token)
		case TokenRParen:
			//Pop operators from the stack to the output until a left parenthesis is encountered
			for len(stack) > 0 && stack[len(stack)-1].Type != TokenLParen {
				output = append(output, stack[len(stack)-1])
				stack = stack[:len(stack)-1]
			}
			if len(stack) == 0 {
				return nil, fmt.Errorf("Syntax Error: Mismatched Parentheses")
			}
			//Discard the left parenthesis from the stack
			stack = stack[:len(stack)-1]
		}
	}
	for len(stack) > 0 {
		if stack[len(stack)-1].Type == TokenLParen || stack[len(stack)-1].Type == TokenRParen {
			return nil, fmt.Errorf("Syntax Error: Mismatched Parentheses")
		}
		output = append(output, stack[len(stack)-1])
		stack = stack[:len(stack)-1]
	}
	return output, nil
}

func evaluateRpn(rpn []Token) (float64, error) {
	var stack []float64
	for _, token := range rpn {
		switch token.Type {
		case TokenNumber:
			num, err := strconv.ParseFloat(token.Value, 64)
			if err != nil {
				return 0, fmt.Errorf("Syntax Error: Invalid Number %s", token.Value)
			}
			stack = append(stack, num)
		case TokenOperator:
			if len(stack) < 2 {
				return 0, fmt.Errorf("Syntax Error: Not enough operands for operator %s", token.Value)
			}
			b := stack[len(stack)-1]
			a := stack[len(stack)-2]
			stack = stack[:len(stack)-2]
			switch token.Value {
			case "+":
				stack = append(stack, a+b)
			case "-":
				stack = append(stack, a-b)
			case "*":
				stack = append(stack, a*b)
			case "/":
				if b == 0 {
					return 0, fmt.Errorf("Math Error: Division by zero")
				}
				stack = append(stack, a/b)
			}
		}
	}
	if len(stack) != 1 {
		return 0, fmt.Errorf("Syntax Error: Invalid expression")
	}
	return stack[0], nil
}

func CalculateExpression(expression string) (float64, error) {
	tokens, err := tokenize(expression)
	if err != nil {
		return 0, err
	}
	rpn, err := parseToRpn(tokens)
	if err != nil {
		return 0, err
	}
	return evaluateRpn(rpn)
}
