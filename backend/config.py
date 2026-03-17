from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    MAPILLARY_ACCESS_TOKEN: str = ""
    HUGGINGFACE_TOKEN: str = ""
    CACHE_DIR: str = "./cache"
    MAX_BATCH_SIZE: int = 32
    MODEL_CACHE_DIR: str = "./model_cache"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
