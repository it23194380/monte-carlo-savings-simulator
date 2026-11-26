
# Data

No external datasets are used in this project.

Investment returns and inflation rates are generated synthetically using independent normal probability distributions.

## Input parameters

| Parameter | Baseline value | Source |
|---|---|---|
| Initial savings | LKR 0 | Model assumption |
| Monthly contribution | LKR 15,000 | Illustrative assumption |
| Expected annual investment return | 8% | Illustrative assumption |
| Annual investment return volatility | 12% | Illustrative assumption |
| Expected annual inflation | 5% | Illustrative assumption |
| Annual inflation volatility | 2% | Illustrative assumption |
| Investment duration | 10 years | Model assumption |
| Inflation-adjusted savings target | LKR 2,000,000 | Model assumption |
| Number of simulations | 10,000 | Experimental design |
| Random seed | 42 | Reproducibility |

## Data generation

All simulation inputs are generated programmatically within the Python notebook using NumPy.

The fixed random seed supports reproducibility of the notebook experiments.

## Data licensing and privacy

No external data licences or access dates are applicable because no external datasets are used.

No personal, confidential or personally identifiable data is collected or processed.

The financial parameters are illustrative and are not calibrated against historical market data.
