package main

import (
	"calculator_backend/parser"
	"context"
	"fmt"
	"net/http"

	"github.com/danielgtaylor/huma/v2"
	"github.com/danielgtaylor/huma/v2/adapters/humago"
	_ "github.com/danielgtaylor/huma/v2/formats/cbor"
)

// CalculationInput represents the request body for the calculation operation.
type CalculationInput struct {
	Body struct {
		Operation string `json:"operation" example:"5+3+4" doc:"Calculation result"`
	}
}

// CalculationOutput represents the response body for the calculation operation.
type CalculationOutput struct {
	Body struct {
		Result string `json:"result" example:"25/0/Syntax Error/Math Error" doc:"Calculation result"`
	}
}

func main() {

	// Create a new router & API
	router := http.NewServeMux()
	api := humago.New(router, huma.DefaultConfig("Calculator API", "1.0.0"))

	huma.Register(api, huma.Operation{
		OperationID: "calculate",
		Method:      http.MethodPost,
		Path:        "/calculate",
		Summary:     "Parsers and evaluates a mathematical expression.",
		Description: "Get the result of a mathematical expression.",
		Tags:        []string{"Calculator|Math"},
	}, func(ctx context.Context, input *CalculationInput) (*CalculationOutput, error) {
		resp := &CalculationOutput{}
		result, err := parser.CalculateExpression(input.Body.Operation)
		if err != nil {
			return nil, err
		}
		resp.Body.Result = fmt.Sprintf("%f", result)
		return resp, nil
	})

	// Start the server!
	http.ListenAndServe("127.0.0.1:8888", router)
}
