import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import LoginPage from "../src/pages/Login";
import { QuizTimer } from "../src/components/student/QuizTimer";
import React from "react";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("Frontend UI Components", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  describe("LoginPage Component", () => {
    it("should render credentials form elements successfully", () => {
      const mockNavigate = vi.fn();
      render(<LoginPage navigate={mockNavigate} />);

      expect(screen.getByText("Portal Sign In")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("user@institution.edu")).toBeInTheDocument();
      expect(screen.getByPlaceholderText("••••••••")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();
    });

    it("should allow email/password inputs to change", () => {
      const mockNavigate = vi.fn();
      render(<LoginPage navigate={mockNavigate} />);

      const emailInput = screen.getByPlaceholderText("user@institution.edu");
      const passwordInput = screen.getByPlaceholderText("••••••••");

      fireEvent.change(emailInput, { target: { value: "test@example.com" } });
      fireEvent.change(passwordInput, { target: { value: "NewPass123" } });

      expect(emailInput).toHaveValue("test@example.com");
      expect(passwordInput).toHaveValue("NewPass123");
    });
  });

  describe("QuizTimer Component", () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("should display remaining minutes and seconds formatted", () => {
      const mockExpired = vi.fn();
      render(<QuizTimer initialTimeLeftSeconds={605} onTimeExpired={mockExpired} />);

      expect(screen.getByText(/Time Remaining: 10:05/i)).toBeInTheDocument();
    });

    it("should count down and trigger callback when remaining time expires", () => {
      const mockExpired = vi.fn();
      render(<QuizTimer initialTimeLeftSeconds={3} onTimeExpired={mockExpired} />);

      expect(screen.getByText(/Time Remaining: 00:03/i)).toBeInTheDocument();

      // Fast-forward 3 seconds
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(mockExpired).toHaveBeenCalledTimes(1);
    });
  });
});
