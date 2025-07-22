# backend/currency_utils.py
"""
Currency conversion utilities for backend KPI calculations.
Uses the same exchange rates as the frontend for consistency.
"""

import logging
from typing import Dict, Optional

logger = logging.getLogger(__name__)

# Exchange rates relative to USD (same as frontend)
EXCHANGE_RATES = {
    'USD': 1.0,
    'GBP': 0.79,
    'EUR': 0.85,
    'JPY': 110.0,
    'CAD': 1.25,
    'AUD': 1.35,
    'CHF': 0.92,
    'CNY': 6.45,
    'SEK': 8.75,
    'NZD': 1.42
}

def normalize_currency_code(currency: str) -> str:
    """
    Normalize currency symbols to currency codes.
    
    Args:
        currency: Currency symbol or code
        
    Returns:
        Normalized currency code
    """
    if not currency:
        return 'USD'
    
    # Map symbols to codes
    symbol_to_code = {
        '$': 'USD',
        '£': 'GBP', 
        '€': 'EUR',
        '¥': 'JPY',
        'C$': 'CAD',
        'A$': 'AUD',
        'CHF': 'CHF',
        '¥': 'CNY',  # Note: JPY and CNY both use ¥, context dependent
        'kr': 'SEK',
        'NZ$': 'NZD'
    }
    
    # Return normalized code
    normalized = symbol_to_code.get(currency, currency.upper())
    
    # Ensure it's a valid currency code
    if normalized not in EXCHANGE_RATES:
        logger.warning(f"Unknown currency code: {normalized}, defaulting to USD")
        return 'USD'
    
    return normalized

def convert_currency(amount: float, from_currency: str, to_currency: str) -> float:
    """
    Convert an amount from one currency to another.
    
    Args:
        amount: The amount to convert
        from_currency: Source currency code (e.g., 'GBP', 'USD')
        to_currency: Target currency code (e.g., 'USD', 'GBP')
    
    Returns:
        Converted amount in the target currency
    """
    # COMPREHENSIVE LOGGING FOR DEBUGGING
    logger.info(f"CURRENCY CONVERSION START: {amount} {from_currency} -> {to_currency}")
    
    if amount == 0:
        logger.info(f" CONVERSION RESULT: 0.00 (amount was zero)")
        return 0.0
    
    # Normalize currency codes
    original_from = from_currency
    original_to = to_currency
    from_currency = normalize_currency_code(from_currency)
    to_currency = normalize_currency_code(to_currency)
    
    logger.info(f" NORMALIZED: {original_from} → {from_currency}, {original_to} → {to_currency}")
    
    # If same currency, no conversion needed
    if from_currency == to_currency:
        logger.info(f" CONVERSION RESULT: {amount:.2f} (same currency, no conversion)")
        return amount
    
    # Check if currencies are supported
    if from_currency not in EXCHANGE_RATES:
        logger.warning(f" Unsupported source currency: {from_currency}, defaulting to USD")
        from_currency = 'USD'
    
    if to_currency not in EXCHANGE_RATES:
        logger.warning(f" Unsupported target currency: {to_currency}, defaulting to USD")
        to_currency = 'USD'
    
    # Convert via USD
    from_rate = EXCHANGE_RATES[from_currency]
    to_rate = EXCHANGE_RATES[to_currency]
    amount_in_usd = amount / from_rate
    converted_amount = amount_in_usd * to_rate
    
    logger.info(f" RATES: {from_currency}={from_rate}, {to_currency}={to_rate}")
    logger.info(f" CALCULATION: {amount} ÷ {from_rate} × {to_rate} = {converted_amount:.2f}")
    logger.info(f" CONVERSION RESULT: {amount} {original_from} → {converted_amount:.2f} {original_to}")
    logger.info(f" CURRENCY CONVERSION END\n")
    
    return converted_amount

def get_user_display_currency(user_settings: Optional[Dict]) -> str:
    """
    Get the user's preferred display currency from their settings.
    
    Args:
        user_settings: User settings dictionary
        
    Returns:
        User's preferred currency code, defaults to USD
    """
    if not user_settings:
        return 'USD'
    
    # Try different possible field names for currency
    currency = (
        user_settings.get('currency') or 
        user_settings.get('displayCurrency') or 
        user_settings.get('preferred_currency') or
        'USD'
    )
    
    return normalize_currency_code(currency)
