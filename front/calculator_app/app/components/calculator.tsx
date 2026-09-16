"use client";

import React, { useState } from 'react';
import { calculateExpression } from '../services/api_service';

const Calculator: React.FC = () => {
  const [display, setDisplay] = useState<string>('');
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleButtonClick = (value: string) => {
    if (display.includes('Error')) {
        setDisplay(value);
        setErrorMsg(null);
        return;
    }
    const lastChar = display.slice(-1);
    const operators = ['+', '-', '×', '÷'];
    if (operators.includes(value) && operators.includes(lastChar)) {
        // Prevent adding two consecutive operators by replacing
        setDisplay((prev) => prev.slice(0, -1) + value);
        setErrorMsg(null);
        return;
    }
    setDisplay((prev) => prev + value);
    setErrorMsg(null);
  };

  const handleClear = () => {
    setDisplay('');
    setResult(null);
    setErrorMsg(null);
  };

  const handleDelete = () => {
    setDisplay((prev) => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleCalculate = async () => {
    if (!display.trim()) return;
    if (display.includes('Error')) {
        handleClear();
        return;
    }

    setLoading(true);
    setErrorMsg(null);

    // Replace visual '×' and '÷' by '*' and '/' for backend processing
    const sanitizedOperation = display.replace(/×/g, '*').replace(/÷/g, '/');

    try {
      const responseResult = await calculateExpression(sanitizedOperation);
      setResult(responseResult);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: unknown | any) {
      if (err instanceof Error) {
        setErrorMsg(err.message);
        setResult(err.message);
        setDisplay(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-xs mx-auto p-4 bg-slate-900 text-white rounded-2xl shadow-xl font-sans">
      {/* Display Screen */}
      <div className="mb-4 p-4 bg-slate-800 rounded-xl text-right overflow-hidden min-h-[80px] flex flex-col justify-end">
        <div className="text-slate-400 text-sm h-6 overflow-x-auto whitespace-nowrap">
          {display || '0'}
        </div>
        <div className="text-3xl font-bold tracking-wide truncate">
          {loading ? (
            <span className="text-indigo-400 text-lg animate-pulse">Loading...</span>
          ) : result !== null ? (
            <span className={errorMsg ? 'text-red-400' : 'text-white'}>{result}</span>
          ) : (
            display || '0'
          )}
        </div>
      </div>

      {/* Buttons Grid */}
      <div className="grid grid-cols-4 gap-2">
        <button
          onClick={handleClear}
          disabled={loading}
          className="col-span-2 p-3 bg-red-500/20 text-red-400 font-semibold rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
        >
          AC
        </button>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="p-3 bg-slate-700 text-slate-200 font-semibold rounded-lg hover:bg-slate-600 transition-colors disabled:opacity-50"
        >
          DEL
        </button>
        <button
          onClick={() => handleButtonClick('÷')}
          disabled={loading}
          className="p-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"
        >
          ÷
        </button>

        <button
          onClick={() => handleButtonClick('(')}
          disabled={loading}
          className="p-3 bg-slate-800 text-slate-300 font-semibold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          (
        </button>
        <button
          onClick={() => handleButtonClick(')')}
          disabled={loading}
          className="p-3 bg-slate-800 text-slate-300 font-semibold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          )
        </button>
        <button
          onClick={() => {}}
          disabled={loading}
          className="p-3 bg-slate-900 text-slate-900 font-semibold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          
        </button>
        <button
          onClick={() => handleButtonClick('×')}
          disabled={loading}
          className="p-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"
        >
          ×
        </button>

        {['7', '8', '9'].map((num) => (
          <button
            key={num}
            onClick={() => handleButtonClick(num)}
            disabled={loading}
            className="p-3 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {num}
          </button>
        ))}
        <button
          onClick={() => handleButtonClick('-')}
          disabled={loading}
          className="p-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"
        >
          -
        </button>

        {['4', '5', '6'].map((num) => (
          <button
            key={num}
            onClick={() => handleButtonClick(num)}
            disabled={loading}
            className="p-3 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {num}
          </button>
        ))}
        <button
          onClick={() => handleButtonClick('+')}
          disabled={loading}
          className="p-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"
        >
          +
        </button>

        {['1', '2', '3'].map((num) => (
          <button
            key={num}
            onClick={() => handleButtonClick(num)}
            disabled={loading}
            className="p-3 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {num}
          </button>
        ))}
        <button
          onClick={handleCalculate}
          disabled={loading}
          className="row-span-2 p-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-500 transition-colors flex items-center justify-center disabled:opacity-50"
        >
          =
        </button>

        <button
          onClick={() => handleButtonClick('0')}
          disabled={loading}
          className="col-span-2 p-3 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          0
        </button>
        <button
          onClick={() => handleButtonClick('.')}
          disabled={loading}
          className="p-3 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          .
        </button>
      </div>
    </div>
  );
};

export default Calculator;