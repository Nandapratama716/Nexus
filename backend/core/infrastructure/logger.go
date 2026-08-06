package infrastructure

import (
	"os"

	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

var Log *zap.Logger

// InitLogger menginisialisasi High-Performance Structured Logger (Zap)
// - Format JSON di lingkungan Production (siap di-forward ke Grafana Loki / ELK Stack)
// - Format Console berwarna di lingkungan Development
func InitLogger() (*zap.Logger, error) {
	env := os.Getenv("APP_ENV")
	var config zap.Config

	if env == "production" {
		config = zap.NewProductionConfig()
		config.EncoderConfig.TimeKey = "timestamp"
		config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	} else {
		config = zap.NewDevelopmentConfig()
		config.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
		config.EncoderConfig.TimeKey = "timestamp"
		config.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
	}

	logger, err := config.Build()
	if err != nil {
		return nil, err
	}

	Log = logger
	zap.ReplaceGlobals(logger)

	logger.Info("[Zap Logger] Structured logging berhasil diinisialisasi", zap.String("env", env))
	return logger, nil
}
