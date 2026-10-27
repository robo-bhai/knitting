/**
 * PPC Sequence & Identifier Generator
 * Handles automatic 5-digit series generation (10000, 10001...) for Work Orders,
 * Plans, and Bags, and date-based sequential generation (DD-MM-YY 001A, 001B...) for Lots.
 */

export const getTodayDateDDMMYY = (d: Date = new Date()): string => {
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${dd}-${mm}-${yy}`;
};

/**
 * Extracts 5-digit number >= 10000 from string
 */
const extract5DigitNumber = (str: string): number | null => {
  if (!str) return null;
  const trimmed = str.trim();
  // Direct 5-digit string e.g. "10000"
  if (/^\d{5}$/.test(trimmed)) {
    const val = parseInt(trimmed, 10);
    return val >= 10000 ? val : null;
  }
  // Embedded 5-digit number e.g. "WO-10000" or "BAG-10001"
  const match = trimmed.match(/\b\d{5}\b/);
  if (match) {
    const val = parseInt(match[0], 10);
    return val >= 10000 ? val : null;
  }
  return null;
};

/**
 * Auto-generates next 5-digit Work Order number (starting at 10000)
 */
export const getNextWorkOrderNumber = (workOrders: { work_order: string }[]): string => {
  let max = 9999;
  for (const wo of workOrders) {
    const val = extract5DigitNumber(wo.work_order);
    if (val !== null && val > max) {
      max = val;
    }
  }
  return String(max + 1);
};

/**
 * Auto-generates next 5-digit Plan ID (starting at 10000)
 */
export const getNextPlanId = (plans: { plan_id: string }[]): string => {
  let max = 9999;
  for (const p of plans) {
    const val = extract5DigitNumber(p.plan_id);
    if (val !== null && val > max) {
      max = val;
    }
  }
  return String(max + 1);
};

/**
 * Auto-generates next 5-digit Bag number (starting at 10000)
 */
export const getNextBagNumber = (bags: { bag_number: string }[]): string => {
  let max = 9999;
  for (const b of bags) {
    const val = extract5DigitNumber(b.bag_number);
    if (val !== null && val > max) {
      max = val;
    }
  }
  return String(max + 1);
};

/**
 * Auto-generates date-based lot identifier e.g. "12-10-26 001A", "12-10-26 001B"
 * If lots exist in the same bag, increments the letter (001A -> 001B -> 001C).
 * If new bag, starts at next batch (001A, 002A, etc.) and guarantees system-wide uniqueness.
 */
export const getNextLotName = (
  allLots: { lot_name: string; bag_id: number; created_at?: string }[],
  targetBagId: number
): string => {
  const today = getTodayDateDDMMYY();
  const bagLots = allLots.filter(l => l.bag_id === targetBagId);

  let candidate = '';

  if (bagLots.length > 0) {
    // There are already lots in this bag.
    // Check if any lot has format "DD-MM-YY 001A" or "001A"
    let maxLetterCode = -1;
    let batchNumber = '001';

    for (const lot of bagLots) {
      const match = lot.lot_name.match(/(\d{3})([A-Za-z])/);
      if (match) {
        batchNumber = match[1];
        const code = match[2].toUpperCase().charCodeAt(0) - 65;
        if (code > maxLetterCode) {
          maxLetterCode = code;
        }
      }
    }

    if (maxLetterCode >= 0) {
      let nextCode = maxLetterCode + 1;
      let batchInt = parseInt(batchNumber, 10);
      if (nextCode >= 26) {
        batchInt += Math.floor(nextCode / 26);
        nextCode = nextCode % 26;
      }
      const bStr = String(batchInt).padStart(3, '0');
      const letter = String.fromCharCode(65 + nextCode);
      candidate = `${today} ${bStr}${letter}`;
    } else {
      // Fallback using bagLots count
      const count = bagLots.length;
      const bInt = Math.floor(count / 26) + 1;
      const bStr = String(bInt).padStart(3, '0');
      const letter = String.fromCharCode(65 + (count % 26));
      candidate = `${today} ${bStr}${letter}`;
    }
  } else {
    // First lot in this bag.
    // Check all lots created today to find highest batch number used today
    let maxBatchUsedToday = 0;
    for (const lot of allLots) {
      if (lot.lot_name.includes(today)) {
        const match = lot.lot_name.match(/(\d{3})[A-Za-z]/);
        if (match) {
          const bVal = parseInt(match[1], 10);
          if (bVal > maxBatchUsedToday) {
            maxBatchUsedToday = bVal;
          }
        }
      }
    }

    const nextBatch = maxBatchUsedToday + 1;
    const bStr = String(nextBatch).padStart(3, '0');
    candidate = `${today} ${bStr}A`;
  }

  // Double-check uniqueness across allLots; if collision occurs, advance letter
  let safetyLoop = 0;
  while (allLots.some(l => l.lot_name.trim().toUpperCase() === candidate.trim().toUpperCase()) && safetyLoop < 50) {
    safetyLoop++;
    const match = candidate.match(/^(\d{2}-\d{2}-\d{2})\s+(\d{3})([A-Z])$/);
    if (match) {
      const datePart = match[1];
      let bInt = parseInt(match[2], 10);
      let letterCode = match[3].charCodeAt(0) - 65 + 1;
      if (letterCode >= 26) {
        bInt += 1;
        letterCode = 0;
      }
      candidate = `${datePart} ${String(bInt).padStart(3, '0')}${String.fromCharCode(65 + letterCode)}`;
    } else {
      candidate = `${candidate}_${safetyLoop}`;
    }
  }

  return candidate;
};
