import { useState, useEffect, useMemo, useCallback } from "react";
import Fuse from "fuse.js";
import "./App.css";

interface FoodInfo {
  Price: string;
  Calories: string;
  Fat: string;
  Saturated_Fat: string;
  Cholesterol: string;
  Sodium: string;
  Carbohydrate: string;
  Total_Fibre: string;
  Sugars: string;
  Protein: string;
  Vitamin_C: string;
  Calcium: string;
  Iron: string;
}

interface FoodItem {
  Location: string;
  Section: string;
  Name: string;
  Info: FoodInfo;
}

const NUTRITIONAL_FIELDS = [
  { key: "Price", label: "Price ($)" },
  { key: "Calories", label: "Calories" },
  { key: "Fat", label: "Fat (g)" },
  { key: "Saturated_Fat", label: "Saturated Fat (g)" },
  { key: "Cholesterol", label: "Cholesterol (mg)" },
  { key: "Sodium", label: "Sodium (mg)" },
  { key: "Carbohydrate", label: "Carbohydrate (g)" },
  { key: "Total_Fibre", label: "Fibre (g)" },
  { key: "Sugars", label: "Sugars (g)" },
  { key: "Protein", label: "Protein (g)" },
  { key: "Vitamin_C", label: "Vitamin C (mg)" },
  { key: "Calcium", label: "Calcium (mg)" },
  { key: "Iron", label: "Iron (mg)" },
];

function parseNumeric(value: string): number {
  return parseFloat(value.replace(/,/g, "")) || 0;
}

function App() {
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [sortField, setSortField] = useState<string>("");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [rangeFilters, setRangeFilters] = useState<
    Record<string, { min: string; max: string }>
  >({});
  const [showRangeFilters, setShowRangeFilters] = useState(false);

  useEffect(() => {
    fetch("/foods.json")
      .then((res) => res.json())
      .then((data) => setFoods(data))
      .catch((err) => console.error("Failed to load foods:", err));
  }, []);

  const locations = useMemo(
    () => Array.from(new Set(foods.map((f) => f.Location))).sort(),
    [foods],
  );

  const sections = useMemo(() => {
    if (!selectedLocation) return [];
    return Array.from(
      new Set(
        foods
          .filter((f) => f.Location === selectedLocation)
          .map((f) => f.Section),
      ),
    ).sort();
  }, [foods, selectedLocation]);

  const handleLocationChange = useCallback(
    (location: string) => {
      setSelectedLocation(location);
      if (!location || !sections.includes(selectedSection)) {
        setSelectedSection("");
      }
    },
    [sections, selectedSection],
  );

  const fuse = useMemo(
    () =>
      new Fuse(foods, {
        keys: ["Name"],
        threshold: 0.4,
        includeScore: true,
      }),
    [foods],
  );

  const filteredFoods = useMemo(() => {
    let result = foods;

    if (selectedLocation) {
      result = result.filter((f) => f.Location === selectedLocation);
    }

    if (selectedSection) {
      result = result.filter((f) => f.Section === selectedSection);
    }

    if (searchQuery.trim()) {
      const searchResults = fuse.search(searchQuery);
      const searchNames = new Set(searchResults.map((r) => r.item.Name));
      result = result.filter((f) => searchNames.has(f.Name));
    }

    Object.entries(rangeFilters).forEach(([field, { min, max }]) => {
      if (min || max) {
        result = result.filter((f) => {
          const value = parseNumeric(f.Info[field as keyof FoodInfo]);
          const minVal = parseFloat(min) || 0;
          const maxVal = parseFloat(max) || Infinity;
          return value >= minVal && value <= maxVal;
        });
      }
    });

    if (sortField) {
      result = [...result].sort((a, b) => {
        const aVal = parseNumeric(a.Info[sortField as keyof FoodInfo]);
        const bVal = parseNumeric(b.Info[sortField as keyof FoodInfo]);
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      });
    }

    return result;
  }, [
    foods,
    selectedLocation,
    selectedSection,
    searchQuery,
    fuse,
    rangeFilters,
    sortField,
    sortDirection,
  ]);

  const handleRangeChange = (
    field: string,
    type: "min" | "max",
    value: string,
  ) => {
    setRangeFilters((prev) => ({
      ...prev,
      [field]: {
        ...(prev[field] || { min: "", max: "" }),
        [type]: value,
      },
    }));
  };

  const clearFilters = () => {
    setSortField("");
    setSortDirection("asc");
    setRangeFilters({});
  };

  return (
    <div className="app">
      <main className="main-content">
        <div className="search-section">
          <input
            type="text"
            className="search-input"
            placeholder="Search foods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filters-section">
          <div className="select-group">
            <label>Location</label>
            <select
              value={selectedLocation}
              onChange={(e) => handleLocationChange(e.target.value)}
            >
              <option value="">All Locations</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          <div className="select-group">
            <label>Section</label>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              disabled={!selectedLocation}
            >
              <option value="">All Sections</option>
              {sections.map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          className="toggle-filters-btn"
          onClick={() => setShowRangeFilters(!showRangeFilters)}
        >
          {showRangeFilters ? "▼" : "▶"} Filter & Sort Options
        </button>

        {showRangeFilters && (
          <div className="range-filters">
            <button className="clear-btn" onClick={clearFilters}>
              Clear All Filters
            </button>

            <div className="sort-section">
              <div className="select-group">
                <label>Sort By</label>
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value)}
                >
                  <option value="">None</option>
                  {NUTRITIONAL_FIELDS.map((field) => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="select-group">
                <label>Order</label>
                <select
                  value={sortDirection}
                  onChange={(e) =>
                    setSortDirection(e.target.value as "asc" | "desc")
                  }
                  disabled={!sortField}
                >
                  <option value="asc">Ascending</option>
                  <option value="desc">Descending</option>
                </select>
              </div>
            </div>

            <div className="range-fields">
              {NUTRITIONAL_FIELDS.map((field) => (
                <div key={field.key} className="range-field">
                  <label>{field.label}</label>
                  <div className="range-inputs">
                    <input
                      type="number"
                      placeholder="Min"
                      value={rangeFilters[field.key]?.min || ""}
                      onChange={(e) =>
                        handleRangeChange(field.key, "min", e.target.value)
                      }
                    />
                    <span>-</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={rangeFilters[field.key]?.max || ""}
                      onChange={(e) =>
                        handleRangeChange(field.key, "max", e.target.value)
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="results-section">
          <p className="results-count">{filteredFoods.length} results</p>

          <div className="food-list">
            {filteredFoods.slice(0, 50).map((food, index) => (
              <div
                key={`${food.Location}-${food.Section}-${food.Name}-${index}`}
                className="food-card"
              >
                <div className="food-header">
                  <h3 className="food-name">{food.Name}</h3>
                  <span className="food-price">${food.Info.Price}</span>
                </div>
                <p className="food-location">
                  {food.Location} - {food.Section}
                </p>
                <div className="food-nutrients">
                  <span>Cal: {food.Info.Calories}</span>
                  <span>Fat: {food.Info.Fat}g</span>
                  <span>Protein: {food.Info.Protein}g</span>
                  <span>Carbs: {food.Info.Carbohydrate}g</span>
                </div>
                <div className="food-nutrients secondary">
                  <span>Chol: {food.Info.Cholesterol}mg</span>
                  <span>Na: {food.Info.Sodium}mg</span>
                  <span>Fibre: {food.Info.Total_Fibre}g</span>
                  <span>Sugar: {food.Info.Sugars}g</span>
                </div>
              </div>
            ))}
          </div>

          {filteredFoods.length > 50 && (
            <p className="more-results">
              Showing first 50 of {filteredFoods.length} results
            </p>
          )}

          {filteredFoods.length === 0 && (
            <p className="no-results">No foods found matching your criteria</p>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
