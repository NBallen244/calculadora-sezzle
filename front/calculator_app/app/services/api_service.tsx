const API_BASE_URL = 'http://localhost:8888';

export interface CalculationRequest {
  operation: string;
}

export interface CalculationError{
    message: string;
}

export interface CalculationResponse {
  result?: string | number;
  errors?: CalculationError[];
}

export const calculateExpression = async (operation: string): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ operation }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      if (errorData && errorData.errors) {
        const mainError = errorData.errors[0]?.message || 'System Error';
        if (mainError.includes('Math')) {
            throw new Error('Math Error');
        }else if (mainError.includes('Syntax')) {
            throw new Error('Syntax Error');
        }
      }
      throw new Error(errorData?.message || `System Error`);
    }

    const data = await response.json();

    // Maneja si la respuesta viene como objeto { result: ... } o directo como valor
    if (typeof data === 'object' && data !== null) {
      if ('result' in data && data.result !== undefined) {
        return data.result.toString();
      }
      if ('error' in data && data.error) {
        throw new Error(data.error);
      }
    }

    return data.toString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: Error | any) {
    throw new Error(error.message || 'System Error');
  }
};