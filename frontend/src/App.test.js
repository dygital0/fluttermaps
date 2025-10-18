import React from 'react'; // Import React
import { render, screen } from '@testing-library/react'; // Import render and screen from Testing Library
import App from './App'; // Import the App component

test('renders learn react link', () => {
    render(<App />);
    const linkElement = screen.getByText(/learn react/i); // Check if the text "learn react" is in the document
    expect(linkElement).toBeInTheDocument(); // Assert that it is indeed in the document
});