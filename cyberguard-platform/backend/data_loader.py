"""
Cybersecurity Threat Detection Dataset Loader
Downloads and processes the Kaggle dataset for threat pattern analysis
"""
import os
import json
from pathlib import Path
from typing import Dict, List, Optional, Any
import pandas as pd

try:
    import kagglehub
except ImportError:
    kagglehub = None  # type: ignore


class ThreatDatasetLoader:
    """
    Loads and processes the cybersecurity threat detection dataset from Kaggle.
    Provides methods to extract threat patterns, signatures, and anomaly characteristics.
    """

    def __init__(self, cache_dir: Optional[str] = None):
        self.cache_dir = cache_dir or os.path.join(os.path.expanduser("~"), ".cyberguard", "datasets")
        self.dataset_path: Optional[str] = None
        self.threat_patterns: List[Dict[str, Any]] = []
        self.attack_signatures: Dict[str, List[Dict[str, Any]]] = {}
        
    def download_dataset(self) -> str:
        """
        Download the cybersecurity threat detection dataset from Kaggle.
        Returns the path to the downloaded dataset.
        """
        if kagglehub is None:
            raise ImportError("kagglehub is not installed. Install with: pip install kagglehub")
        
        print("📥 Downloading cybersecurity threat detection dataset from Kaggle...")
        try:
            # Download latest version
            path = kagglehub.dataset_download("aryan208/cybersecurity-threat-detection-logs")
            self.dataset_path = path
            print(f"✅ Dataset downloaded successfully to: {path}")
            return path
        except Exception as e:
            print(f"❌ Error downloading dataset: {e}")
            print("💡 Make sure you have Kaggle API credentials configured.")
            print("   Visit: https://www.kaggle.com/docs/api")
            raise
    
    def load_dataset(self, force_download: bool = False) -> pd.DataFrame:
        """
        Load the threat detection dataset. Downloads if not already cached.
        
        Args:
            force_download: Force re-download even if cached
            
        Returns:
            DataFrame containing threat detection logs
        """
        if force_download or self.dataset_path is None:
            self.download_dataset()
        
        # Find CSV files in the dataset directory
        dataset_files = list(Path(self.dataset_path).glob("*.csv"))
        
        if not dataset_files:
            raise FileNotFoundError(f"No CSV files found in {self.dataset_path}")
        
        # Load the first CSV file (or combine multiple if needed)
        print(f"📊 Loading dataset from: {dataset_files[0]}")
        df = pd.read_csv(dataset_files[0])
        
        print(f"✅ Loaded {len(df)} threat records")
        print(f"📋 Columns: {', '.join(df.columns.tolist())}")
        
        return df
    
    def extract_threat_patterns(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """
        Extract threat patterns from the dataset for AI analysis.
        
        Args:
            df: DataFrame containing threat logs
            
        Returns:
            List of threat pattern dictionaries
        """
        patterns = []
        
        # Group by attack type and extract characteristics
        if 'attack_type' in df.columns or 'Attack Type' in df.columns or 'threat_label' in df.columns:
            if 'threat_label' in df.columns:
                attack_col = 'threat_label'
            elif 'attack_type' in df.columns:
                attack_col = 'attack_type'
            else:
                attack_col = 'Attack Type'
            
            for attack_type, group in df.groupby(attack_col):
                pattern = {
                    'attack_type': str(attack_type),
                    'count': len(group),
                    'characteristics': {}
                }
                
                # Extract numeric features
                numeric_cols = group.select_dtypes(include=['number']).columns
                for col in numeric_cols:
                    pattern['characteristics'][col] = {
                        'mean': float(group[col].mean()),
                        'std': float(group[col].std()),
                        'min': float(group[col].min()),
                        'max': float(group[col].max()),
                        'median': float(group[col].median())
                    }
                
                patterns.append(pattern)
        
        self.threat_patterns = patterns
        print(f"🔍 Extracted {len(patterns)} unique threat patterns")
        return patterns
    
    def get_attack_signatures(self, df: pd.DataFrame) -> Dict[str, List[Dict[str, Any]]]:
        """
        Extract attack signatures categorized by type.
        
        Args:
            df: DataFrame containing threat logs
            
        Returns:
            Dictionary mapping attack types to their signatures
        """
        signatures = {}
        
        if 'attack_type' in df.columns or 'Attack Type' in df.columns or 'threat_label' in df.columns:
            if 'threat_label' in df.columns:
                attack_col = 'threat_label'
            elif 'attack_type' in df.columns:
                attack_col = 'attack_type'
            else:
                attack_col = 'Attack Type'
            
            for attack_type, group in df.groupby(attack_col):
                attack_sigs = []
                
                # Sample representative records
                samples = group.head(10).to_dict('records')
                
                for sample in samples:
                    sig = {
                        'type': str(attack_type),
                        'features': {k: v for k, v in sample.items() if pd.notna(v)}
                    }
                    attack_sigs.append(sig)
                
                signatures[str(attack_type)] = attack_sigs
        
        self.attack_signatures = signatures
        print(f"🔐 Extracted signatures for {len(signatures)} attack types")
        return signatures
    
    def get_anomaly_thresholds(self, df: pd.DataFrame) -> Dict[str, Dict[str, float]]:
        """
        Calculate anomaly detection thresholds based on the dataset.
        
        Args:
            df: DataFrame containing threat logs
            
        Returns:
            Dictionary of feature thresholds
        """
        thresholds = {}
        
        numeric_cols = df.select_dtypes(include=['number']).columns
        
        for col in numeric_cols:
            # Calculate percentiles for threshold detection
            q95 = df[col].quantile(0.95)
            q99 = df[col].quantile(0.99)
            mean = df[col].mean()
            std = df[col].std()
            
            thresholds[col] = {
                'mean': float(mean),
                'std': float(std),
                'p95': float(q95),
                'p99': float(q99),
                'upper_bound': float(mean + 3 * std),
                'lower_bound': float(mean - 3 * std)
            }
        
        print(f"📏 Calculated thresholds for {len(thresholds)} features")
        return thresholds
    
    def save_processed_data(self, output_dir: Optional[str] = None) -> str:
        """
        Save processed threat patterns and signatures to JSON files.
        
        Args:
            output_dir: Directory to save processed data
            
        Returns:
            Path to the output directory
        """
        if output_dir is None:
            output_dir = os.path.join(self.cache_dir, "processed")
        
        os.makedirs(output_dir, exist_ok=True)
        
        # Save threat patterns
        patterns_file = os.path.join(output_dir, "threat_patterns.json")
        with open(patterns_file, 'w') as f:
            json.dump(self.threat_patterns, f, indent=2)
        
        # Save attack signatures
        signatures_file = os.path.join(output_dir, "attack_signatures.json")
        with open(signatures_file, 'w') as f:
            json.dump(self.attack_signatures, f, indent=2)
        
        print(f"💾 Saved processed data to: {output_dir}")
        return output_dir
    
    def get_summary(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Get a summary of the dataset.
        
        Args:
            df: DataFrame containing threat logs
            
        Returns:
            Summary dictionary
        """
        summary = {
            'total_records': len(df),
            'columns': df.columns.tolist(),
            'dtypes': {col: str(dtype) for col, dtype in df.dtypes.items()},
            'missing_values': df.isnull().sum().to_dict(),
            'shape': df.shape
        }
        
        if 'attack_type' in df.columns or 'Attack Type' in df.columns or 'threat_label' in df.columns:
            if 'threat_label' in df.columns:
                attack_col = 'threat_label'
            elif 'attack_type' in df.columns:
                attack_col = 'attack_type'
            else:
                attack_col = 'Attack Type'
            summary['attack_distribution'] = df[attack_col].value_counts().to_dict()
        
        return summary


def initialize_threat_database():
    """
    Initialize and load the threat detection dataset.
    Returns the loader instance with loaded data.
    """
    print("🚀 Initializing Threat Detection Database...")
    
    loader = ThreatDatasetLoader()
    
    try:
        # Load the dataset
        df = loader.load_dataset()
        
        # Extract patterns and signatures
        loader.extract_threat_patterns(df)
        loader.get_attack_signatures(df)
        thresholds = loader.get_anomaly_thresholds(df)
        
        # Save processed data
        loader.save_processed_data()
        
        # Print summary
        summary = loader.get_summary(df)
        print(f"\n📊 Dataset Summary:")
        print(f"   Total Records: {summary['total_records']}")
        print(f"   Columns: {len(summary['columns'])}")
        if 'attack_distribution' in summary:
            print(f"   Attack Types: {len(summary['attack_distribution'])}")
            print(f"\n🎯 Top Attack Types:")
            for attack_type, count in list(summary['attack_distribution'].items())[:5]:
                print(f"      - {attack_type}: {count}")
        
        print("\n✅ Threat database initialized successfully!")
        return loader
        
    except Exception as e:
        print(f"\n⚠️  Could not initialize threat database: {e}")
        print("    The system will use built-in heuristics instead.")
        return None


if __name__ == "__main__":
    # Test the loader
    loader = initialize_threat_database()
