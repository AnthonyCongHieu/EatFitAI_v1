# EatFitAI Dataset V2 Pipeline

This folder contains the reproducible pipeline for rebuilding the EatFitAI YOLO11m training dataset from raw audited sources.

The pipeline order is:

1. Audit raw sources.
2. Reject bad sources and bad classes.
3. Build a clean YOLO detection dataset.
4. Validate final audit gates.
5. Package for Kaggle.
6. Run smoke training.
7. Run full YOLO11m training.

Do not commit raw datasets, Kaggle tokens, Roboflow tokens, model checkpoints, generated reports, or generated clean datasets.

## Local Commands

```powershell
python ai-provider\dataset_v2\audit_sources.py --raw-dir "_dataset_v2_work\raw_zips" --out-dir "_dataset_v2_reports"
python ai-provider\dataset_v2\make_sample_grids.py --audit-json "_dataset_v2_reports\source_audit.json" --out-dir "_dataset_v2_reports\sample_grids"
python ai-provider\dataset_v2\build_clean_dataset.py --audit-json "_dataset_v2_reports\source_audit.json" --taxonomy "_dataset_v2_reports\class_taxonomy.final.yaml" --out-dataset "_dataset_v2_work\clean_dataset" --out-reports "_dataset_v2_reports"
python ai-provider\dataset_v2\validate_clean_dataset.py --dataset "_dataset_v2_work\clean_dataset" --out "_dataset_v2_reports\final_audit_summary.json"
python ai-provider\dataset_v2\build_kaggle_training_package.py --dataset "_dataset_v2_work\clean_dataset" --reports "_dataset_v2_reports" --out-dir "_dataset_v2_kaggle_package"
```

Generated folders are intentionally ignored by git.
