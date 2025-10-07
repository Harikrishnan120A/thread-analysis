#!/usr/bin/env python3
"""
Display Real Dataset Samples
Shows actual malicious attacks from the Kaggle dataset
"""
import pandas as pd

# Load the real dataset
df = pd.read_csv('/root/.cache/kagglehub/datasets/aryan208/cybersecurity-threat-detection-logs/versions/1/cybersecurity_threat_detection_logs.csv')

print("=" * 80)
print("🔥 REAL MALICIOUS ATTACKS FROM KAGGLE DATASET")
print("=" * 80)
print()

# Get malicious attacks
malicious = df[df['threat_label'] == 'malicious'].head(15)

for idx, row in malicious.iterrows():
    print(f"🚨 Attack #{idx+1}:")
    print(f"   Time:       {row['timestamp']}")
    print(f"   Source IP:  {row['source_ip']}")
    print(f"   Dest IP:    {row['dest_ip']}")
    print(f"   Protocol:   {row['protocol']}")
    print(f"   Path:       {row['request_path']}")
    print(f"   User-Agent: {row['user_agent']}")
    print(f"   Bytes:      {row['bytes_transferred']}")
    print(f"   Action:     {row['action']}")
    print(f"   Log Type:   {row['log_type']}")
    print()

print("=" * 80)
print("📊 SUSPICIOUS ACTIVITIES FROM DATASET")
print("=" * 80)
print()

suspicious = df[df['threat_label'] == 'suspicious'].head(10)

for idx, row in suspicious.iterrows():
    print(f"⚠️  Activity #{idx+1}:")
    print(f"   Time:       {row['timestamp']}")
    print(f"   Source IP:  {row['source_ip']}")
    print(f"   Path:       {row['request_path']}")
    print(f"   Protocol:   {row['protocol']}")
    print()

print("=" * 80)
print("📈 DATASET STATISTICS")
print("=" * 80)
print()
print(f"Total Records: {len(df):,}")
print()
print("Threat Distribution:")
print(df['threat_label'].value_counts())
print()
print("Protocol Distribution:")
print(df['protocol'].value_counts().head(10))
print()
print("Top Request Paths:")
print(df['request_path'].value_counts().head(10))
