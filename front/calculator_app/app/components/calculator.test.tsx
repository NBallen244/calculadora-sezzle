import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Calculator from './calculator';
import { calculateExpression } from '../services/api_service';

// Replace the real API service with a Jest mock so tests run without network access.
jest.mock('../services/api_service');

// Typed handle to the mocked function for mockResolvedValue / mockRejectedValue helpers.
const mockedCalculate = calculateExpression as jest.MockedFunction<
  typeof calculateExpression
>;

// Reset the mock implementation and call records before each test so state from
// one test never bleeds into the next.
beforeEach(() => {
  mockedCalculate.mockReset();
});

/**
 * Click a calculator button by its visible label.
 *
 * Buttons are keyed off their accessible name (the rendered text), e.g.
 * 'AC', 'DEL', '÷', '(', ')', '×', '7', '+', '=', '.'. The empty no-op button
 * has no accessible label and is intentionally not reachable through this helper.
 */
const clickButton = (
  user: ReturnType<typeof userEvent.setup>,
  label: string
): Promise<void> => user.click(screen.getByRole('button', { name: label }));

describe('Calculator', () => {
  it('renders without crashing', () => {
    render(<Calculator />);
    expect(screen.getByRole('button', { name: '=' })).toBeInTheDocument();
  });
});

/**
 * Read the top display line's text content.
 *
 * The top display div (`text-slate-400 ...`) always renders `display || '0'`.
 * Scoping to this element avoids ambiguity with the large result line (which
 * can show the same string) and with digit buttons (whose labels match digits).
 */
const displayText = (): string => {
  const line = document.querySelector('div.text-slate-400');
  return line?.textContent ?? '';
};

describe('handleButtonClick', () => {
  it('appends a clicked value to the display when the display does not include Error', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await clickButton(user, '7');
    await clickButton(user, '+');
    await clickButton(user, '3');

    // The top display line reflects `display || '0'`; after these clicks it is '7+3'.
    expect(displayText()).toBe('7+3');
  });

  it('replaces the display with the clicked value alone and clears the error styling when the display shows Error', async () => {
    const user = userEvent.setup();
    // Force the component into the error display state by rejecting the calculation.
    mockedCalculate.mockRejectedValue(new Error('Math Error'));
    render(<Calculator />);

    // Build an expression and calculate so display/result become the error message.
    await clickButton(user, '7');
    await clickButton(user, '÷');
    await clickButton(user, '0');
    await clickButton(user, '=');

    // Wait for the error to surface: the result span carries the red error styling.
    const errorResult = await screen.findByText('Math Error', {
      selector: 'span.text-red-400',
    });
    expect(errorResult).toBeInTheDocument();

    // Clicking a value button while the display includes 'Error' replaces the
    // whole display with just that value alone (not appended to the error text).
    await clickButton(user, '5');

    // Display line now shows '5' alone.
    expect(displayText()).toBe('5');
    // The error styling is cleared: no red-styled result element remains.
    expect(document.querySelector('span.text-red-400')).not.toBeInTheDocument();
  });

  it('replaces the last character with the new operator when the last display char is an operator', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await clickButton(user, '7');
    await clickButton(user, '+');
    // Clicking another operator while the last char is an operator replaces it.
    await clickButton(user, '×');

    expect(displayText()).toBe('7×');
  });

  it('clears the error message after a value button click', async () => {
    const user = userEvent.setup();
    mockedCalculate.mockRejectedValue(new Error('Math Error'));
    render(<Calculator />);

    // Reach the error state: the result span is red while errorMsg is set.
    await clickButton(user, '8');
    await clickButton(user, '=');
    await screen.findByText('Math Error', { selector: 'span.text-red-400' });

    // A value button click clears errorMsg -> the red error styling is removed.
    await clickButton(user, '2');

    expect(document.querySelector('span.text-red-400')).not.toBeInTheDocument();
  });
});

describe('handleClear and handleDelete', () => {
  it('resets the display to the "0" fallback and clears result/error state when AC is clicked', async () => {
    const user = userEvent.setup();
    // Reject so the calculation drives display/result/errorMsg into the error state.
    mockedCalculate.mockRejectedValue(new Error('Math Error'));
    render(<Calculator />);

    // Build an expression and calculate so result is set and the error styling appears.
    await clickButton(user, '7');
    await clickButton(user, '÷');
    await clickButton(user, '0');
    await clickButton(user, '=');
    await screen.findByText('Math Error', { selector: 'span.text-red-400' });

    // Clicking AC resets display (''), result (null), and errorMsg (null).
    await clickButton(user, 'AC');

    // Display line falls back to '0' because display is now empty.
    expect(displayText()).toBe('0');
    // Result is null -> the large line also renders the '0' fallback, not a result span.
    // The error styling is cleared: no red-styled result element remains.
    expect(document.querySelector('span.text-red-400')).not.toBeInTheDocument();
  });

  it('removes the last character of the display when DEL is clicked', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    await clickButton(user, '7');
    await clickButton(user, '8');
    await clickButton(user, '9');
    expect(displayText()).toBe('789');

    // Clicking DEL removes the last character of the display.
    await clickButton(user, 'DEL');

    expect(displayText()).toBe('78');
  });
});

describe('handleCalculate (empty & error short-circuit)', () => {
  it('does not call the API mock when = is clicked with an empty display', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    // Fresh render: display is '' -> display.trim() is falsy, so handleCalculate
    // returns immediately without invoking the API.
    await clickButton(user, '=');

    expect(mockedCalculate).not.toHaveBeenCalled();
    // Display line still shows the '0' fallback since display remains empty.
    expect(displayText()).toBe('0');
  });

  it('resets display/result/error and does not call the API mock when = is clicked while the display includes Error', async () => {
    const user = userEvent.setup();
    // Reject so the first calculation drives display/result/errorMsg into the error state.
    mockedCalculate.mockRejectedValue(new Error('Math Error'));
    render(<Calculator />);

    // Build an expression and calculate so display/result become the error message.
    await clickButton(user, '7');
    await clickButton(user, '÷');
    await clickButton(user, '0');
    await clickButton(user, '=');

    // Wait for the error to surface: the result span carries the red error styling.
    await screen.findByText('Math Error', { selector: 'span.text-red-400' });
    // The first '=' invoked the API once.
    expect(mockedCalculate).toHaveBeenCalledTimes(1);

    // Clear the call record so we can assert the short-circuit path makes no new calls.
    mockedCalculate.mockClear();

    // Display now includes 'Error' -> the second '=' hits the short-circuit branch,
    // which calls handleClear() and returns without invoking the API.
    await clickButton(user, '=');

    // handleClear resets display ('') -> the display line falls back to '0'.
    expect(displayText()).toBe('0');
    // Result is null and errorMsg is null -> no red-styled result element remains.
    expect(document.querySelector('span.text-red-400')).not.toBeInTheDocument();
    // The API mock was not called again by the short-circuit path.
    expect(mockedCalculate).not.toHaveBeenCalled();
  });
});

describe('handleCalculate (sanitization & success path)', () => {
  it('substitutes × with * when calling the API mock on =', async () => {
    const user = userEvent.setup();
    // Resolve with a value so the success branch settles and we can await it.
    mockedCalculate.mockResolvedValue('12');
    render(<Calculator />);

    // Build '6×2' through real button clicks, then calculate.
    await clickButton(user, '6');
    await clickButton(user, '×');
    await clickButton(user, '2');
    await clickButton(user, '=');

    // Await the resolved value surfacing in the result span so the async handler
    // has settled (scoped to the span to avoid the matching display line/digit button).
    await screen.findByText('12', { selector: 'span.text-white' });

    // handleCalculate sanitizes '×' -> '*' before calling calculateExpression.
    expect(mockedCalculate).toHaveBeenCalledWith('6*2');
  });

  it('substitutes ÷ with / when calling the API mock on =', async () => {
    const user = userEvent.setup();
    mockedCalculate.mockResolvedValue('4');
    render(<Calculator />);

    // Build '8÷2' through real button clicks, then calculate.
    await clickButton(user, '8');
    await clickButton(user, '÷');
    await clickButton(user, '2');
    await clickButton(user, '=');

    // Await the resolved value surfacing in the result span so the async handler
    // has settled (scoped to the span to avoid the matching display line/digit button).
    await screen.findByText('4', { selector: 'span.text-white' });

    // handleCalculate sanitizes '÷' -> '/' before calling calculateExpression.
    expect(mockedCalculate).toHaveBeenCalledWith('8/2');
  });

  it('sets both the result span and the display line to the resolved value on success', async () => {
    const user = userEvent.setup();
    // Resolve with '42' so both setResult and setDisplay receive it.
    mockedCalculate.mockResolvedValue('42');
    render(<Calculator />);

    // Build an expression and calculate.
    await clickButton(user, '4');
    await clickButton(user, '+');
    await clickButton(user, '2');
    await clickButton(user, '=');

    // The resolved value appears in the result span (no error styling on success).
    const resultSpan = await screen.findByText('42', {
      selector: 'span.text-white',
    });
    expect(resultSpan).toBeInTheDocument();

    // setDisplay('42') also updates the top display line to the resolved value.
    expect(displayText()).toBe('42');
  });
});

describe('handleCalculate (failure path & loading completion)', () => {
  it('sets errorMsg/result/display to the error message when the calculation rejects with an Error', async () => {
    const user = userEvent.setup();
    // Reject with an Error so the catch branch sets errorMsg, result, and display
    // all to the error message.
    mockedCalculate.mockRejectedValue(new Error('Math Error'));
    render(<Calculator />);

    // Build an expression and calculate.
    await clickButton(user, '7');
    await clickButton(user, '÷');
    await clickButton(user, '0');
    await clickButton(user, '=');

    // The error message surfaces in the result span with the red error styling
    // (setErrorMsg + setResult both receive err.message).
    const errorResult = await screen.findByText('Math Error', {
      selector: 'span.text-red-400',
    });
    expect(errorResult).toBeInTheDocument();

    // setDisplay(err.message) also drives the top display line to the error message.
    expect(displayText()).toBe('Math Error');
  });

  it('returns loading to inactive after a calculation completes so buttons are re-enabled', async () => {
    const user = userEvent.setup();
    // Resolve so the success branch settles and the finally block flips loading off.
    mockedCalculate.mockResolvedValue('5');
    render(<Calculator />);

    // Build an expression and calculate.
    await clickButton(user, '2');
    await clickButton(user, '+');
    await clickButton(user, '3');
    await clickButton(user, '=');

    // Await the resolved value surfacing so the async handler (and its finally
    // block) has fully settled.
    await screen.findByText('5', { selector: 'span.text-white' });

    // finally: setLoading(false) -> buttons are no longer disabled.
    expect(screen.getByRole('button', { name: '=' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'AC' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '7' })).toBeEnabled();
  });
});

describe('render branches (loading, error styling, result fallback, disabled buttons)', () => {
  it('shows the "Loading..." indicator and disables all buttons while a calculation is in flight', async () => {
    const user = userEvent.setup();
    // A never-resolving promise keeps handleCalculate suspended at `await`, so
    // loading stays true and the loading branch renders indefinitely.
    mockedCalculate.mockReturnValue(new Promise<string>(() => {}));
    render(<Calculator />);

    // Build an expression and trigger the calculation.
    await clickButton(user, '2');
    await clickButton(user, '+');
    await clickButton(user, '3');
    await clickButton(user, '=');

    // loading === true -> the result line renders the "Loading..." indicator.
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Every button carries `disabled={loading}`, so all are disabled during loading.
    expect(screen.getByRole('button', { name: 'AC' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'DEL' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '=' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '÷' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '×' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '7' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '0' })).toBeDisabled();
  });

  it('renders the result element with the text-red-400 class while an error is set', async () => {
    const user = userEvent.setup();
    // Reject with an Error so errorMsg is set and the result span uses the red class.
    mockedCalculate.mockRejectedValue(new Error('Syntax Error'));
    render(<Calculator />);

    // Build an expression and calculate to drive the component into the error state.
    await clickButton(user, '7');
    await clickButton(user, '+');
    await clickButton(user, '=');

    // errorMsg truthy -> the result span is rendered with the `text-red-400` class.
    const errorResult = await screen.findByText('Syntax Error', {
      selector: 'span.text-red-400',
    });
    expect(errorResult).toHaveClass('text-red-400');
  });

  it('renders the "0" fallback while result is null and the display is empty', () => {
    render(<Calculator />);

    // Fresh render: result is null and display is '' -> the result line renders
    // the `display || '0'` fallback, i.e. '0'.
    expect(displayText()).toBe('0');
    // No result span is present because result is null.
    expect(document.querySelector('span.text-white')).not.toBeInTheDocument();
    expect(document.querySelector('span.text-red-400')).not.toBeInTheDocument();
  });

  it('renders the display value while result is null after typing a value', async () => {
    const user = userEvent.setup();
    render(<Calculator />);

    // Typing a value updates display but leaves result null (no calculation yet).
    await clickButton(user, '9');

    // result null -> the result line renders `display || '0'`, i.e. '9'.
    expect(displayText()).toBe('9');
    // No result span while result is null.
    expect(document.querySelector('span.text-white')).not.toBeInTheDocument();
    expect(document.querySelector('span.text-red-400')).not.toBeInTheDocument();
  });
});
