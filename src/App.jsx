import { useState, useCallback } from "react";

const QUICK_SCALES = [
  { label: "½x", value: 0.5 },
  { label: "1x", value: 1 },
  { label: "2x", value: 2 },
  { label: "4x", value: 4 },
];

// Unit conversion map (all to base unit, then back)
const UNIT_CONVERSIONS = {
  // Volume
  tsp: { base: "tsp", factor: 1 },
  tbsp: { base: "tsp", factor: 3 },
  "fl oz": { base: "tsp", factor: 6 },
  cup: { base: "tsp", factor: 48 },
  pint: { base: "tsp", factor: 96 },
  quart: { base: "tsp", factor: 192 },
  gallon: { base: "tsp", factor: 768 },
  ml: { base: "ml", factor: 1 },
  l: { base: "ml", factor: 1000 },
  // Weight
  oz: { base: "oz", factor: 1 },
  lb: { base: "oz", factor: 16 },
  g: { base: "g", factor: 1 },
  kg: { base: "g", factor: 1000 },
};

const VOLUME_UNITS_TSP = [
  { unit: "tsp", threshold: 0 },
  { unit: "tbsp", threshold: 3 },
  { unit: "cup", threshold: 48 },
  { unit: "quart", threshold: 192 },
  { unit: "gallon", threshold: 768 },
];

function smartScale(amount, unit, factor) {
  if (!amount || isNaN(amount)) return { amount: "", unit };
  const scaled = amount * factor;

  const conv = UNIT_CONVERSIONS[unit?.toLowerCase()];
  if (!conv) {
    // No known unit, just scale the number
    return { amount: formatNumber(scaled), unit };
  }

  // Convert to base, then find best unit
  const baseVal = scaled * conv.factor;

  if (conv.base === "tsp") {
    let best = VOLUME_UNITS_TSP[0];
    for (const u of VOLUME_UNITS_TSP) {
      if (baseVal >= u.threshold) best = u;
    }
    const converted = baseVal / UNIT_CONVERSIONS[best.unit].factor;
    return { amount: formatNumber(converted), unit: best.unit };
  }

  return { amount: formatNumber(scaled), unit };
}

function formatNumber(n) {
  if (n === 0) return "0";
  if (Number.isInteger(n)) return String(n);
  // Try to express as a nice fraction
  const fractions = [
    [1, 8], [1, 4], [1, 3], [3, 8], [1, 2],
    [5, 8], [2, 3], [3, 4], [7, 8],
  ];
  const whole = Math.floor(n);
  const decimal = n - whole;
  if (decimal < 0.01) return String(whole);
  for (const [num, den] of fractions) {
    if (Math.abs(decimal - num / den) < 0.04) {
      const frac = `${num}⁄${den}`;
      return whole > 0 ? `${whole} ${frac}` : frac;
    }
  }
  return parseFloat(n.toFixed(2)).toString();
}

function parseIngredientLine(line) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  // Match: optional number (including fractions), optional unit, rest is name
  const numPattern = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.?\d*)\s*/;
  const unitPattern = /^(gallons?|quarts?|pints?|cups?|fl\.?\s*oz\.?|tbsp\.?|tsp\.?|tablespoons?|teaspoons?|lbs?\.?|pounds?|ozs?\.?|ounces?|kgs?\.?|kilograms?|grams?|g|ml|l)\s*/i;

  let rest = trimmed;
  let amount = "";
  let unit = "";

  const numMatch = rest.match(numPattern);
  if (numMatch) {
    const raw = numMatch[1];
    if (raw.includes("/")) {
      const [n, d] = raw.split("/");
      if (raw.includes(" ")) {
        const parts = raw.split(" ");
        amount = parseInt(parts[0]) + parseInt(parts[1].split("/")[0]) / parseInt(parts[1].split("/")[1]);
      } else {
        amount = parseInt(n) / parseInt(d);
      }
    } else {
      amount = parseFloat(raw);
    }
    rest = rest.slice(numMatch[0].length);
  }

  const unitMatch = rest.match(unitPattern);
  if (unitMatch) {
    const rawUnit = unitMatch[1].toLowerCase().replace(/s$/, "").replace(/\.$/, "").replace("tablespoon", "tbsp").replace("teaspoon", "tsp").replace("pound", "lb").replace("ounce", "oz").replace("gram", "g").replace("kilogram", "kg").replace("fl oz", "fl oz").replace("fl. oz", "fl oz");
    unit = rawUnit;
    rest = rest.slice(unitMatch[0].length);
  }

  return {
    id: Math.random().toString(36).slice(2),
    original: trimmed,
    amount: amount || "",
    unit,
    name: rest.trim() || trimmed,
    hasNumber: !!amount,
  };
}

export default function RecipeScaler() {
  const [recipeName, setRecipeName] = useState("");
  const [servings, setServings] = useState("");
  const [rawText, setRawText] = useState("");
  const [ingredients, setIngredients] = useState([]);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [customServings, setCustomServings] = useState("");
  const [parsed, setParsed] = useState(false);
  const [activeQuick, setActiveQuick] = useState(1);

  const handleParse = useCallback(() => {
    const lines = rawText.split("\n").filter(l => l.trim());
    const parsed = lines.map(parseIngredientLine).filter(Boolean);
    setIngredients(parsed);
    setParsed(true);
    setScaleFactor(1);
    setActiveQuick(1);
    setCustomServings("");
  }, [rawText]);

  const handleQuickScale = (val) => {
    setScaleFactor(val);
    setActiveQuick(val);
    setCustomServings("");
  };

  const handleCustomServings = (val) => {
    setCustomServings(val);
    const base = parseFloat(servings);
    const target = parseFloat(val);
    if (base > 0 && target > 0) {
      setScaleFactor(target / base);
      setActiveQuick(null);
    }
  };

  const scaledServings = servings
    ? formatNumber(parseFloat(servings) * scaleFactor)
    : null;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#1a1208",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      color: "#f5e6c8",
      padding: "0",
    }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #2d1f0a 0%, #1a1208 100%)",
        borderBottom: "2px solid #8b5e1a",
        padding: "32px 24px 24px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
          backgroundImage: "radial-gradient(circle at 20% 50%, rgba(139,94,26,0.12) 0%, transparent 60%), radial-gradient(circle at 80% 50%, rgba(180,120,40,0.08) 0%, transparent 60%)",
        }} />
        <div style={{ position: "relative" }}>
          <div style={{ fontSize: "13px", letterSpacing: "4px", color: "#c49a3c", textTransform: "uppercase", marginBottom: "8px" }}>
            ✦ Professional Kitchen Tool ✦
          </div>
          <h1 style={{
            fontSize: "clamp(28px, 6vw, 48px)",
            fontWeight: "700",
            color: "#f5e6c8",
            margin: "0 0 6px",
            letterSpacing: "1px",
            textShadow: "0 2px 20px rgba(180,120,40,0.3)",
          }}>
            Recipe Scaler
          </h1>
          <p style={{ color: "#a07840", fontSize: "15px", margin: 0, fontStyle: "italic" }}>
            Scale any recipe to any size — instantly
          </p>
        </div>
      </div>

      <div style={{ maxWidth: "780px", margin: "0 auto", padding: "32px 20px" }}>

        {/* Input Section */}
        <div style={{
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(139,94,26,0.3)",
          borderRadius: "12px",
          padding: "28px",
          marginBottom: "24px",
        }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
            <div>
              <label style={{ display: "block", fontSize: "12px", letterSpacing: "2px", color: "#c49a3c", textTransform: "uppercase", marginBottom: "8px" }}>
                Recipe Name
              </label>
              <input
                value={recipeName}
                onChange={e => setRecipeName(e.target.value)}
                placeholder="e.g. Beef Bourguignon"
                style={{
                  width: "100%", padding: "12px 14px", background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(139,94,26,0.4)", borderRadius: "8px",
                  color: "#f5e6c8", fontSize: "15px", outline: "none", boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "12px", letterSpacing: "2px", color: "#c49a3c", textTransform: "uppercase", marginBottom: "8px" }}>
                Original Servings
              </label>
              <input
                value={servings}
                onChange={e => setServings(e.target.value)}
                placeholder="e.g. 4"
                type="number"
                min="1"
                style={{
                  width: "100%", padding: "12px 14px", background: "rgba(0,0,0,0.3)",
                  border: "1px solid rgba(139,94,26,0.4)", borderRadius: "8px",
                  color: "#f5e6c8", fontSize: "15px", outline: "none", boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "12px", letterSpacing: "2px", color: "#c49a3c", textTransform: "uppercase", marginBottom: "8px" }}>
              Ingredients — one per line
            </label>
            <div style={{ fontSize: "12px", color: "#7a5c30", marginBottom: "8px", fontStyle: "italic" }}>
              Format: amount unit ingredient &nbsp;·&nbsp; e.g. "2 cups flour" or "1 1/2 tsp salt" or "3 eggs"
            </div>
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder={"2 cups all-purpose flour\n1 tsp baking soda\n1/2 tsp salt\n3/4 cup butter\n2 eggs\n1 tbsp vanilla extract"}
              rows={8}
              style={{
                width: "100%", padding: "14px", background: "rgba(0,0,0,0.3)",
                border: "1px solid rgba(139,94,26,0.4)", borderRadius: "8px",
                color: "#f5e6c8", fontSize: "15px", outline: "none", boxSizing: "border-box",
                fontFamily: "'Courier New', monospace", lineHeight: "1.7", resize: "vertical",
              }}
            />
          </div>

          <button
            onClick={handleParse}
            disabled={!rawText.trim()}
            style={{
              width: "100%", padding: "14px", background: rawText.trim() ? "linear-gradient(135deg, #8b5e1a, #c49a3c)" : "rgba(139,94,26,0.2)",
              border: "none", borderRadius: "8px", color: rawText.trim() ? "#1a1208" : "#5a4020",
              fontSize: "15px", fontWeight: "700", letterSpacing: "2px", textTransform: "uppercase",
              cursor: rawText.trim() ? "pointer" : "not-allowed", transition: "all 0.2s",
              fontFamily: "inherit",
            }}
          >
            Parse Ingredients →
          </button>
        </div>

        {/* Scaling Controls */}
        {parsed && ingredients.length > 0 && (
          <div style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(139,94,26,0.3)",
            borderRadius: "12px",
            padding: "28px",
            marginBottom: "24px",
          }}>
            <div style={{ fontSize: "12px", letterSpacing: "2px", color: "#c49a3c", textTransform: "uppercase", marginBottom: "16px" }}>
              Scale To
            </div>

            {/* Quick buttons */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
              {QUICK_SCALES.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => handleQuickScale(value)}
                  style={{
                    padding: "10px 24px",
                    background: activeQuick === value ? "linear-gradient(135deg, #8b5e1a, #c49a3c)" : "rgba(0,0,0,0.3)",
                    border: activeQuick === value ? "1px solid #c49a3c" : "1px solid rgba(139,94,26,0.3)",
                    borderRadius: "8px",
                    color: activeQuick === value ? "#1a1208" : "#c49a3c",
                    fontSize: "18px", fontWeight: "700", cursor: "pointer",
                    transition: "all 0.15s", fontFamily: "inherit", minWidth: "70px",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Custom servings */}
            {servings && (
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ color: "#a07840", fontSize: "14px" }}>Feed exactly</span>
                <input
                  value={customServings}
                  onChange={e => handleCustomServings(e.target.value)}
                  placeholder={servings}
                  type="number"
                  min="1"
                  style={{
                    width: "80px", padding: "10px 12px", background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(139,94,26,0.4)", borderRadius: "8px",
                    color: "#f5e6c8", fontSize: "16px", fontWeight: "700", outline: "none",
                    textAlign: "center", fontFamily: "inherit",
                  }}
                />
                <span style={{ color: "#a07840", fontSize: "14px" }}>people</span>
                {customServings && parseFloat(servings) > 0 && (
                  <span style={{ color: "#c49a3c", fontSize: "13px" }}>
                    (×{formatNumber(parseFloat(customServings) / parseFloat(servings))})
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {parsed && ingredients.length > 0 && (
          <div style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(139,94,26,0.3)",
            borderRadius: "12px",
            overflow: "hidden",
          }}>
            {/* Result header */}
            <div style={{
              background: "linear-gradient(135deg, rgba(139,94,26,0.25), rgba(180,120,40,0.15))",
              borderBottom: "1px solid rgba(139,94,26,0.3)",
              padding: "20px 28px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: "18px", fontWeight: "700", color: "#f5e6c8" }}>
                  {recipeName || "Scaled Recipe"}
                </div>
                {scaledServings && (
                  <div style={{ fontSize: "13px", color: "#a07840", marginTop: "3px" }}>
                    {scaledServings} serving{parseFloat(scaledServings) !== 1 ? "s" : ""}
                    {scaleFactor !== 1 && (
                      <span style={{ color: "#c49a3c", marginLeft: "8px" }}>
                        (×{formatNumber(scaleFactor)} from original {servings})
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div style={{
                background: "rgba(196,154,60,0.15)", border: "1px solid rgba(196,154,60,0.3)",
                borderRadius: "8px", padding: "8px 16px", fontSize: "22px", fontWeight: "700", color: "#c49a3c",
              }}>
                ×{formatNumber(scaleFactor)}
              </div>
            </div>

            {/* Ingredient list */}
            <div style={{ padding: "8px 0" }}>
              {ingredients.map((ing, i) => {
                const scaled = ing.hasNumber
                  ? smartScale(ing.amount, ing.unit, scaleFactor)
                  : null;

                return (
                  <div
                    key={ing.id}
                    style={{
                      display: "flex", alignItems: "baseline", gap: "12px",
                      padding: "13px 28px",
                      background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)",
                      borderBottom: i < ingredients.length - 1 ? "1px solid rgba(139,94,26,0.1)" : "none",
                    }}
                  >
                    <div style={{
                      minWidth: "100px", textAlign: "right",
                      fontSize: "17px", fontWeight: "700", color: "#c49a3c",
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      {scaled ? scaled.amount : "—"}
                    </div>
                    <div style={{ minWidth: "52px", fontSize: "14px", color: "#8b6535" }}>
                      {scaled ? scaled.unit : ""}
                    </div>
                    <div style={{ fontSize: "15px", color: "#e8d4a8", flex: 1 }}>
                      {ing.name}
                    </div>
                    {!ing.hasNumber && (
                      <div style={{ fontSize: "11px", color: "#5a4020", fontStyle: "italic" }}>
                        to taste
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Copy button */}
            <div style={{ padding: "20px 28px", borderTop: "1px solid rgba(139,94,26,0.2)" }}>
              <button
                onClick={() => {
                  const lines = ingredients.map(ing => {
                    const scaled = ing.hasNumber ? smartScale(ing.amount, ing.unit, scaleFactor) : null;
                    if (!scaled) return ing.name;
                    return `${scaled.amount}${scaled.unit ? " " + scaled.unit : ""} ${ing.name}`.trim();
                  });
                  const header = `${recipeName || "Recipe"} — ${scaledServings || ""} servings\n${"─".repeat(40)}\n`;
                  navigator.clipboard.writeText(header + lines.join("\n"));
                }}
                style={{
                  padding: "10px 24px", background: "transparent",
                  border: "1px solid rgba(139,94,26,0.4)", borderRadius: "8px",
                  color: "#a07840", fontSize: "13px", letterSpacing: "1px",
                  textTransform: "uppercase", cursor: "pointer", fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.target.style.borderColor = "#c49a3c"; e.target.style.color = "#c49a3c"; }}
                onMouseLeave={e => { e.target.style.borderColor = "rgba(139,94,26,0.4)"; e.target.style.color = "#a07840"; }}
              >
                Copy to Clipboard
              </button>
            </div>
          </div>
        

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: "40px", color: "#4a3418", fontSize: "12px", letterSpacing: "2px" }}>
          RECIPE SCALER · PROFESSIONAL KITCHEN EDITION
        </div>
      </div>
    </div>
  );
}
