import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score

if __name__ == "__main__":
    print("Loading physical dataset...")
    # Update path if your file is inside a data/ folder
    df = pd.read_csv('data/ner_physical_hazards.csv') 
    
    features = [
        'Elevation_m', 
        'Slope_deg', 
        'Distance_to_River_m', 
        'Live_Rain_mmh', 
        'Cumulative_Rain_mm'
    ]
    
    X = df[features]
    y = df['Hazard']
    
    # stratify=y ensures the 82/18 ratio is maintained in both train and test splits
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    print("Training XGBoost Classifier on physical features...")
    
    # scale_pos_weight handles the 82/18 class imbalance (81.7 / 18.3 ≈ 4.46)
    model = xgb.XGBClassifier(
        eval_metric='logloss', 
        max_depth=5, 
        n_estimators=100,
        scale_pos_weight=4.5 
    )
    model.fit(X_train, y_train)
    
    predictions = model.predict(X_test)
    
    print("\n--- Model Evaluation ---")
    print(f"Overall Accuracy: {accuracy_score(y_test, predictions)*100:.2f}%\n")
    print("Detailed Classification Report:")
    print(classification_report(y_test, predictions))
    
    model.save_model('nera_physical_model.json')
    print("Model mathematically bound to physical units saved to 'nera_physical_model.json'.")