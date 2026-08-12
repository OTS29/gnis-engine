// negotiationEngine.js - The Core Decision Engine for GNIS AI Twin

class NegotiationEngine {
  constructor(basePrice, floorPrice, occupancyRate, valueAddItem = "complimentary hair wash") {
    this.basePrice = Number(basePrice);       // Standard price (e.g., 30)
    this.floorPrice = Number(floorPrice);     // Absolute minimum (e.g., 22)
    this.occupancyRate = occupancyRate;       // Current booking % (0.0 to 1.0)
    this.valueAddItem = valueAddItem;         // Custom incentive for floor protection
  }

  // Formats numbers cleanly to currency strings without floating-point bugs
  formatCurrency(amount) {
    return Number(amount.toFixed(2));
  }

  evaluateRequest(requestedTime, clientCounterOffer = null) {
    const isWeekend = this.checkPeakTime(requestedTime);

    // Check 1: High Demand or Peak Hours (Peak Pricing)
    if (this.occupancyRate > 0.8 || isWeekend) {
      const peakPrice = this.formatCurrency(this.basePrice * 1.2);
      return {
        status: "PEAK",
        offer: peakPrice,
        message: `This is a high-demand slot. The premium rate is £${peakPrice}`
      };
    }

    // Check 2: Low Demand (Discount Offer to fill the chair)
    if (this.occupancyRate < 0.3 && !clientCounterOffer) {
      const discountPrice = this.formatCurrency(this.basePrice * 0.85);
      return {
        status: "DISCOUNT",
        offer: discountPrice,
        message: `I can get you a special rate of £${discountPrice} if you book now!`
      };
    }

    // Check 3: Negotiation / Counter-Offer Handling
    if (clientCounterOffer !== null) {
      const parsedCounter = Number(clientCounterOffer);

      if (parsedCounter >= this.floorPrice) {
        return {
          status: "ACCEPTED",
          offer: parsedCounter,
          message: "That works for us. I've locked in that price for you."
        };
      } else {
        // AI offers a "Value-Add" middle ground to protect the floor price
        return {
          status: "COUNTER",
          offer: this.floorPrice,
          message: `I can't go down to £${parsedCounter}, but I can do £${this.floorPrice} with a ${this.valueAddItem}.`
        };
      }
    }

    // Default Fallback
    return { 
      status: "STANDARD", 
      offer: this.basePrice, 
      message: `Standard rate is £${this.basePrice}` 
    };
  }

  // Helper method to look at the date string or day
  checkPeakTime(requestedTime) {
    if (!requestedTime) return false;
    const date = new Date(requestedTime);
    const day = date.getDay(); 
    return day === 5 || day === 6; // Returns true for Friday and Saturday
  }
}

export default NegotiationEngine;