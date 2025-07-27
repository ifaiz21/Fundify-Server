import joblib
import pandas as pd
import requests
from io import BytesIO
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# --- Step 1: Input data ke liye naya schema banayein ---
# Data structure based on the provided sample
class CampaignData(BaseModel):
    main_category: str
    currency: str
    goal: float
    pledged: float
    backers: int
    country: str
    pkr_pledged: float
    pkr_pledged_real: float
    pkr_goal_real: float

# FastAPI app initialize karein
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Production mein isse apni frontend URL se replace karein
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Function to download and load model/encoder from S3 with progress
def load_from_s3(url):
    try:
        print(f"Downloading from: {url}")
        response = requests.get(url, timeout=300, stream=True)  # Increased timeout to 5 minutes
        response.raise_for_status()
        
        # Get file size if available
        total_size = int(response.headers.get('content-length', 0))
        if total_size > 0:
            print(f"File size: {total_size / (1024*1024):.1f} MB")
        
        # Download with progress indication
        content = BytesIO()
        downloaded = 0
        chunk_size = 8192
        
        for chunk in response.iter_content(chunk_size=chunk_size):
            if chunk:
                content.write(chunk)
                downloaded += len(chunk)
                if total_size > 0:
                    progress = (downloaded / total_size) * 100
                    print(f"\rDownloading... {progress:.1f}%", end="", flush=True)
        
        print(f"\nDownload complete. Loading model...")
        content.seek(0)
        model_obj = joblib.load(content)
        print("Model loaded successfully!")
        return model_obj
        
    except Exception as e:
        print(f"Error loading from {url}: {e}")
        raise e

# Global variables for lazy loading
model = None
category_encoder = None
country_encoder = None
currency_encoder = None
state_encoder = None
models_loaded = False

def load_models():
    global model, category_encoder, country_encoder, currency_encoder, state_encoder, models_loaded
    
    if models_loaded:
        return
    
    try:
        print("Loading models and encoders from S3...")
        
        # Load smaller encoders first
        print("Loading encoders...")
        category_encoder = load_from_s3('https://aibucket-fundify.s3.eu-north-1.amazonaws.com/CategoryEncoder.pkl')
        country_encoder = load_from_s3('https://aibucket-fundify.s3.eu-north-1.amazonaws.com/CountryEncoder.pkl')
        currency_encoder = load_from_s3('https://aibucket-fundify.s3.eu-north-1.amazonaws.com/CurrencyEncoder.pkl')
        state_encoder = load_from_s3('https://aibucket-fundify.s3.eu-north-1.amazonaws.com/StateEncoder.pkl')
        
        # Load large model last
        print("Loading main model (this may take a while)...")
        model = load_from_s3('https://aibucket-fundify.s3.eu-north-1.amazonaws.com/trained_model.pkl')
        
        models_loaded = True
        print("All models and encoders loaded successfully!")
        
    except Exception as e:
        print(f"Error loading models/encoders: {e}")
        models_loaded = False
        raise e

@app.post('/predict')
def predict_success(data: CampaignData):
    try:
        # Load models if not already loaded
        if not models_loaded:
            load_models()
        
        # --- Step 3: Encoders ko istemal karke text ko numbers mein convert karein ---
        # Input data ko DataFrame mein convert karein
        input_df = pd.DataFrame([data.dict()])
        
        print("Input data received:")
        print(input_df)

        # Create a copy for processing
        processed_df = input_df.copy()

        # Transform categorical features using their respective encoders
        # Handle potential unknown categories gracefully
        # Note: Encode in place to match training approach
        try:
            processed_df['main_category'] = category_encoder.transform(processed_df[['main_category']])
        except ValueError as e:
            print(f"Unknown category: {processed_df['main_category'].iloc[0]}")
            return {'error': f'Unknown category: {processed_df["main_category"].iloc[0]}'}
        
        try:
            processed_df['country'] = country_encoder.transform(processed_df[['country']])
        except ValueError as e:
            print(f"Unknown country: {processed_df['country'].iloc[0]}")
            return {'error': f'Unknown country: {processed_df["country"].iloc[0]}'}
        
        try:
            processed_df['currency'] = currency_encoder.transform(processed_df[['currency']])
        except ValueError as e:
            print(f"Unknown currency: {processed_df['currency'].iloc[0]}")
            return {'error': f'Unknown currency: {processed_df["currency"].iloc[0]}'}

        # Select features for model prediction in the exact order the model expects
        feature_columns = [
            'main_category', 'currency', 'goal', 'pledged', 'backers', 'country',
            'pkr_pledged', 'pkr_pledged_real', 'pkr_goal_real'
        ]
        
        # Check if all required features are available
        missing_features = [col for col in feature_columns if col not in processed_df.columns]
        if missing_features:
            return {'error': f'Missing features: {missing_features}'}
        
        features_for_model = processed_df[feature_columns]
        
        print("Features for model:")
        print(features_for_model)
        print("Feature columns:", features_for_model.columns.tolist())
        
        # Debug: Check if model has feature_names_in_ attribute
        if hasattr(model, 'feature_names_in_'):
            print("Model expects these features:", model.feature_names_in_)
        
        # Make prediction
        prediction = model.predict(features_for_model)
        probability = model.predict_proba(features_for_model)
        
        # Get the predicted state using state encoder
        # Handle the prediction properly for inverse transform
        try:
            # prediction is already a 1D array, so we just need to inverse transform it
            print(state_encoder.inverse_transform([prediction[0]]))
            predicted_state = state_encoder.inverse_transform([prediction[0]])[0]
        except Exception as e:
            print(f"Error in inverse transform: {e}")
            # Fallback to returning the numeric prediction
            predicted_state = f"state_{prediction[0]}"

        return {
            'predicted_state': predicted_state,
            'prediction_code': int(prediction[0]),
            'probabilities': {
                'class_0': round(probability[0][1] * 100, 2),
                'class_1': round(probability[0][0] * 100, 2) if len(probability[0]) > 1 else 0
            },
            'success_probability': round(probability[0][0] * 100, 2) if len(probability[0]) > 1 else round(probability[0][1] * 100, 2)
        }

    except Exception as e:
        print(f"Error in prediction: {str(e)}")
        return {'error': str(e)}

@app.get('/')
def health_check():
    return {'status': 'healthy', 'message': 'Fundify ML Prediction API is running', 'models_loaded': models_loaded}

@app.post('/load-models')
def manual_load_models():
    try:
        load_models()
        return {'status': 'success', 'message': 'Models loaded successfully'}
    except Exception as e:
        return {'status': 'error', 'message': str(e)}

@app.get('/model-info')
def model_info():
    try:
        info = {
            'model_loaded': model is not None,
            'models_loaded_flag': models_loaded,
            'encoders_loaded': {
                'category': category_encoder is not None,
                'country': country_encoder is not None,
                'currency': currency_encoder is not None,
                'state': state_encoder is not None
            }
        }
        
        # Add feature names if available
        if model and hasattr(model, 'feature_names_in_'):
            info['expected_features'] = model.feature_names_in_.tolist()
        
        return info
    except:
        return {'error': 'Models not properly loaded'}