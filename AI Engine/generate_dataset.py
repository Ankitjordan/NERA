import pandas as pd
import numpy as np
import os

def create_synthetic_data(num_samples=20000):
    np.random.seed(42)
    
    # 1. Geomorphological Features
    elevation = np.random.uniform(10, 3000, num_samples) # 10m (plains) to 3000m (peaks)
    slope = np.random.uniform(0, 45, num_samples)        # 0° (flat) to 45° (steep cliffs)
    dist_to_river = np.random.uniform(10, 5000, num_samples)
    
    # 2. Meteorological Features
    # Exponential distribution mimics real rain: mostly light/none, rarely extreme
    live_rain = np.random.exponential(scale=8.0, size=num_samples) 
    cumulative_rain = live_rain * np.random.uniform(12, 48, num_samples) 
    
    # 3. Deterministic Rules
    hazard = np.zeros(num_samples, dtype=int)
    
    for i in range(num_samples):
        # Landslide Physics: Steep slope + heavy cumulative saturation + active rain trigger
        if slope[i] > 15 and cumulative_rain[i] > 100 and live_rain[i] > 12:
            hazard[i] = 1
        # Flood Physics: Low elevation basin + proximity to river + heavy cumulative rain
        elif elevation[i] < 200 and dist_to_river[i] < 500 and cumulative_rain[i] > 150:
            hazard[i] = 1
            
        # Add 5% noise so the ML model learns thresholds, not rigid boolean logic
        if np.random.rand() < 0.05:
            hazard[i] = 1 if hazard[i] == 0 else 0
            
    df = pd.DataFrame({
        'Elevation_m': elevation,
        'Slope_deg': slope,
        'Distance_to_River_m': dist_to_river,
        'Live_Rain_mmh': live_rain,
        'Cumulative_Rain_mm': cumulative_rain,
        'Hazard': hazard
    })
    
    return df

if __name__ == "__main__":
    print("Generating deterministic physics-based dataset...")
    df = create_synthetic_data()
    
    # Ensure data directory exists
    os.makedirs('data', exist_ok=True)
    
    df.to_csv('data/ner_physical_hazards.csv', index=False)
    print(f"Dataset saved successfully! Total records: {len(df)}")
    print("\nHazard Ratio:")
    print(df['Hazard'].value_counts(normalize=True) * 100)