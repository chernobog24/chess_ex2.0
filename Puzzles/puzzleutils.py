import pandas as pd
import numpy as np
import os
import matplotlib.pyplot as plt
import json
from collections import defaultdict

# Get the current script's directory
script_dir = os.path.dirname(os.path.abspath(__file__))

def get_file_size(file_path):
    return os.path.getsize(file_path) / (1024 * 1024)  # Size in MB

def plot_distribution(df, column, title, xlabel, ylabel):
    plt.figure(figsize=(10, 6))
    df[column].hist(bins=50)
    plt.title(title)
    plt.xlabel(xlabel)
    plt.ylabel(ylabel)
    plt.show()

def analyze_distribution(df):
    analysis = "Rating Distribution:\n"
    analysis += str(df['Rating'].describe()) + "\n\n"
    analysis += "Rating Distribution by Percentiles:\n"
    for i in range(0, 101, 10):
        analysis += f"{i}th percentile: {df['Rating'].quantile(i/100):.0f}\n"
    return analysis

def custom_sample_distribution(df, n_samples):
    # Define rating bins and their target proportions
    bins = [1000, 1400, 1800, 2200, 2600, 3000, 3400]
    target_proportions = [0.15, 0.2, 0.2, 0.2, 0.15, 0.1]
    
    sampled_df = pd.DataFrame()
    for i in range(len(bins) - 1):
        bin_df = df[(df['Rating'] >= bins[i]) & (df['Rating'] < bins[i+1])]
        target_samples = int(n_samples * target_proportions[i])
        if len(bin_df) > target_samples:
            sampled_df = pd.concat([sampled_df, bin_df.sample(target_samples)])
        else:
            sampled_df = pd.concat([sampled_df, bin_df])
    
    # If we don't have enough samples, add more from the entire range
    if len(sampled_df) < n_samples:
        remaining = n_samples - len(sampled_df)
        additional_samples = df[~df.index.isin(sampled_df.index)].sample(remaining)
        sampled_df = pd.concat([sampled_df, additional_samples])
    
    return sampled_df.sample(frac=1).reset_index(drop=True)  # Shuffle the results

def create_sample_database(input_file, output_file, n_samples):
    # Load the trimmed database
    df = pd.read_csv(input_file)
    
    print(f"Original trimmed database:")
    print(analyze_distribution(df))
    
    # Sample 150,000 puzzles with custom distribution
    sampled_df = custom_sample_distribution(df, n_samples)
    
    print(f"\nSampled {n_samples} puzzles:")
    print(analyze_distribution(sampled_df))
    
    # Save the sampled puzzles
    sampled_df.to_csv(output_file, index=False)
    print(f"\nSampled database saved to {output_file}")
    print(f"New file size: {get_file_size(output_file):.2f} MB")
    print(f"Number of puzzles in sampled database: {len(sampled_df)}")

def sort_puzzles_by_elo(input_file, output_file):
    # Read the JSON file
    with open(input_file, 'r') as f:
        puzzles = json.load(f)

    # Create a defaultdict to store puzzles by ELO group
    elo_groups = defaultdict(list)

    # Sort puzzles into ELO groups
    for puzzle in puzzles:
        elo = puzzle['Rating']
        group = (elo // 100) * 100  # Round down to nearest 100
        elo_groups[group].append(puzzle)

    # Create the output structure
    output = {}
    for group, puzzles in sorted(elo_groups.items()):
        output[f"{group}-{group+99}"] = puzzles

    # Write the sorted puzzles to a new JSON file
    with open(output_file, 'w') as f:
        json.dump(output, f, indent=2)

# Create the sample database
#input_file = os.path.join(script_dir, 'trimmed_lichess_db_puzzle.csv')
#output_file = os.path.join(script_dir, 'sampled_lichess_db_puzzle.csv')
#create_sample_database(input_file, output_file, 150000)
# sort the JSON file once created
input_file = os.path.join(script_dir, 'puzzles.json')
output_file = os.path.join(script_dir, 'sorted_puzzle.json')
sort_puzzles_by_elo(input_file, output_file)