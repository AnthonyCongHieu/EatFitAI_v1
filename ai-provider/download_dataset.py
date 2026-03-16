from pathlib import Path
import os

from roboflow import Roboflow

print('=' * 60)
print('DOWNLOADING EATFITAI INGREDIENTS DATASET FROM ROBOFLOW')
print('=' * 60)

api_key = os.getenv('ROBOFLOW_API_KEY')
workspace_name = os.getenv('ROBOFLOW_WORKSPACE', 'conghieu')
project_name = os.getenv('ROBOFLOW_PROJECT', 'eatfitai-ingredients-v1-wfulm')
download_format = os.getenv('ROBOFLOW_FORMAT', 'yolov8')
download_location = os.getenv('ROBOFLOW_DOWNLOAD_DIR', 'D:/datasets')
version_number = int(os.getenv('ROBOFLOW_VERSION', '4'))

if not api_key or api_key.startswith('SET_'):
    raise RuntimeError(
        'Missing ROBOFLOW_API_KEY. Set it in your shell or ai-provider/.env before running download_dataset.py.'
    )

rf = Roboflow(api_key=api_key)
project = rf.workspace(workspace_name).project(project_name)
version = project.version(version_number)

download_path = Path(download_location)
print(f'\nDownloading dataset to {download_path}...')

try:
    dataset = version.download(download_format, location=str(download_path))

    print('\nDownload complete!')
    print(f'Dataset location: {dataset.location}')

    datasets_dir = Path('datasets')
    datasets_dir.mkdir(exist_ok=True)

    data_yaml_source = Path(dataset.location) / 'data.yaml'
    data_yaml_dest = datasets_dir / 'data.yaml'

    if data_yaml_source.exists():
        content = data_yaml_source.read_text(encoding='utf-8')
        dataset_dir = Path(dataset.location).resolve().as_posix()
        content = content.replace('../train/images', f'{dataset_dir}/train/images')
        content = content.replace('../valid/images', f'{dataset_dir}/valid/images')
        content = content.replace('../test/images', f'{dataset_dir}/test/images')
        data_yaml_dest.write_text(content, encoding='utf-8')

        print('\nCreated data.yaml with absolute paths!')
        print(f'Location: {data_yaml_dest.resolve()}')
        print('\nDataset ready for training!')
except Exception as error:
    print(f'\nError: {error}')
    print('\nPlease check:')
    print('  1. Internet connection')
    print('  2. Roboflow API key')
    print('  3. Disk space on the configured download directory')