import json
import logging
import time

class JSONFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": self.formatTime(record, "%Y-%m-%dT%H:%M:%SZ"),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        # Include exception trace if present
        if record.exc_info:
            log_data["exception"] = self.formatException(record.exc_info)
            
        # Merge extra context dict fields if supplied
        if hasattr(record, "extra_context"):
            log_data.update(record.extra_context)
            
        return json.dumps(log_data)


def setup_structured_logging():
    # Clear existing handlers to prevent duplicate lines
    root_logger = logging.getLogger()
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
        
    # Configure console handler with JSONFormatter
    handler = logging.StreamHandler()
    handler.setFormatter(JSONFormatter())
    root_logger.addHandler(handler)
    root_logger.setLevel(logging.INFO)
    
    # Configure Uvicorn logger handlers to use the JSONFormatter
    for logger_name in ("uvicorn", "uvicorn.access", "uvicorn.error"):
        uv_logger = logging.getLogger(logger_name)
        for h in uv_logger.handlers[:]:
            uv_logger.removeHandler(h)
        uv_logger.addHandler(handler)
        uv_logger.propagate = False
