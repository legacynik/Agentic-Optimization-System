# Code Documentation Skill

## Regola Fondamentale

**OGNI codice scritto DEVE essere commentato.**

---

## Python

```python
def calculate_discount(price: float, percentage: float) -> float:
    """
    Calcola il prezzo scontato.

    Args:
        price: Prezzo originale
        percentage: Percentuale di sconto (0-100)

    Returns:
        Prezzo dopo lo sconto

    Example:
        >>> calculate_discount(100, 20)
        80.0
    """
    # Valida che la percentuale sia nel range corretto
    if not 0 <= percentage <= 100:
        raise ValueError("Percentage must be between 0 and 100")

    # Applica lo sconto
    discount = price * (percentage / 100)
    return price - discount
```

## TypeScript/JavaScript

```typescript
/**
 * Calcola il prezzo scontato.
 *
 * @param price - Prezzo originale
 * @param percentage - Percentuale di sconto (0-100)
 * @returns Prezzo dopo lo sconto
 * @throws Error se percentage non è nel range 0-100
 *
 * @example
 * calculateDiscount(100, 20) // returns 80
 */
function calculateDiscount(price: number, percentage: number): number {
  // Valida che la percentuale sia nel range corretto
  if (percentage < 0 || percentage > 100) {
    throw new Error("Percentage must be between 0 and 100");
  }

  // Applica lo sconto
  const discount = price * (percentage / 100);
  return price - discount;
}
```

---

## Cosa Commentare

### SEMPRE commentare:
- **Funzioni/Metodi**: Docstring con parametri, return, esempio
- **Classi**: Scopo, attributi principali, uso tipico
- **Logica complessa**: Spiegare il "perché", non solo il "cosa"
- **Regex/Query**: Spiegare cosa matchano/selezionano
- **Magic numbers**: Perché quel valore specifico
- **Workaround/Hack**: Perché è necessario, ticket/issue di riferimento

### NON commentare:
- Codice auto-esplicativo (`i += 1  # incrementa i` ❌)
- Getter/setter banali senza logica

---

## Formato Commenti

### Inline (logica)
```python
# Perché: gli utenti premium hanno 30 giorni extra di prova
trial_days = 14 + (30 if user.is_premium else 0)
```

### Block (sezioni)
```python
# ─────────────────────────────────────────
# DATABASE CONNECTION
# Inizializza connessione con retry logic
# ─────────────────────────────────────────
```

---

## Checklist

Prima di committare, verifica:
- [ ] Ogni funzione ha docstring
- [ ] Logica non ovvia è commentata
- [ ] Magic numbers spiegati
- [ ] Regex/query documentate
