const errorMiddleware = (err, req, res, next) => {
    console.error(err.stack);

    res.status(err.status || 500).json({
        status: err.status || 500,
        message: err.message || "Internal Server Error",
        errors: err.errors || [],
    });
};

export default errorMiddleware
