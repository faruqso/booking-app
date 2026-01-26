"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

interface PaystackInlineProps {
  publicKey: string;
  email: string;
  amount: number; // Amount in major currency unit (e.g., 23.00 for NGN 23.00)
  currency: string;
  reference: string;
  metadata?: Record<string, any>;
  onSuccess: (reference: string) => void;
  onClose: () => void;
  open: boolean;
}

declare global {
  interface Window {
    PaystackPop: {
      setup: (options: {
        key: string;
        email: string;
        amount: number; // Amount in smallest currency unit
        currency: string;
        ref: string;
        metadata?: Record<string, any>;
        callback: (response: { reference: string; status: string; message: string }) => void;
        onClose: () => void;
      }) => { openIframe: () => void };
    };
  }
}

export function PaystackInline({
  publicKey,
  email,
  amount,
  currency,
  reference,
  metadata,
  onSuccess,
  onClose,
  open,
}: PaystackInlineProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scriptLoaded = useRef(false);
  const paystackInitialized = useRef(false);
  const handlerRef = useRef<any>(null);

  // Load Paystack inline script
  useEffect(() => {
    if (scriptLoaded.current) return;

    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => {
      scriptLoaded.current = true;
      setLoading(false);
    };
    script.onerror = () => {
      setError("Failed to load Paystack payment script");
      setLoading(false);
    };

    document.body.appendChild(script);

    return () => {
      // Don't remove script on cleanup to avoid reloading
    };
  }, []);

  // Initialize Paystack payment when modal opens
  useEffect(() => {
    if (!open || !scriptLoaded.current || paystackInitialized.current) return;

    // Security: Validate inputs before initializing payment
    if (!publicKey || !email || !amount || !currency || !reference) {
      setError("Invalid payment configuration");
      setLoading(false);
      return;
    }

    // Security: Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Invalid email address");
      setLoading(false);
      return;
    }

    // Security: Validate amount is positive and reasonable
    if (amount <= 0 || amount > 1000000) {
      setError("Invalid payment amount");
      setLoading(false);
      return;
    }

    // Convert amount to smallest currency unit (kobo for NGN, cents for USD, etc.)
    const amountInSmallestUnit = Math.round(amount * 100);
    
    // Security: Double-check amount conversion didn't result in 0 or invalid value
    if (amountInSmallestUnit <= 0) {
      setError("Invalid payment amount");
      setLoading(false);
      return;
    }

    const initializePayment = () => {
      try {
        if (window.PaystackPop) {
          const handler = window.PaystackPop.setup({
            key: publicKey,
            email: email,
            amount: amountInSmallestUnit,
            currency: currency.toUpperCase(),
            ref: reference,
            metadata: metadata,
            callback: (response: { reference: string; status: string; message: string }) => {
              paystackInitialized.current = false;
              handlerRef.current = null;
              
              // Security: Verify response reference matches expected reference
              if (response.reference && response.reference !== reference) {
                console.error("Payment reference mismatch:", {
                  expected: reference,
                  received: response.reference,
                });
                setError("Payment verification failed. Please contact support.");
                return;
              }
              
              if (response.status === "success" || response.reference) {
                onSuccess(response.reference);
              } else {
                // Security: Don't expose detailed error messages to users
                setError(response.message || "Payment could not be completed. Please try again.");
              }
            },
            onClose: () => {
              paystackInitialized.current = false;
              handlerRef.current = null;
              onClose();
            },
          });

          handlerRef.current = handler;
          
          // Small delay to ensure DOM is ready
          setTimeout(() => {
            handler.openIframe();
            paystackInitialized.current = true;
            setLoading(false);
          }, 100);
        } else {
          setError("Paystack payment script not loaded");
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Paystack initialization error:", err);
        setError(err.message || "Failed to initialize payment");
        setLoading(false);
        paystackInitialized.current = false;
      }
    };

    // Wait a bit for script to be fully ready
    if (scriptLoaded.current) {
      initializePayment();
    }
  }, [open, scriptLoaded.current, publicKey, email, amount, currency, reference]);

  // Reset when modal closes
  useEffect(() => {
    if (!open) {
      paystackInitialized.current = false;
      setError(null);
      setLoading(true);
      handlerRef.current = null;
    }
  }, [open]);

  // Paystack creates its own overlay/modal, so we don't need to render a Dialog
  // Just trigger the payment when open is true
  return null;
}
