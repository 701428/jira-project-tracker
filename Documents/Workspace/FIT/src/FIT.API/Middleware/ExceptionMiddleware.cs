using System.Net;
using System.Text.Json;

namespace FIT.API.Middleware;

public class ExceptionMiddleware
{
    private readonly RequestDelegate               _next;
    private readonly ILogger<ExceptionMiddleware>  _log;
    private readonly IHostEnvironment              _env;

    public ExceptionMiddleware(RequestDelegate next, ILogger<ExceptionMiddleware> log, IHostEnvironment env)
    {
        _next = next;
        _log  = log;
        _env  = env;
    }

    public async Task InvokeAsync(HttpContext ctx)
    {
        try
        {
            await _next(ctx);
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "Unhandled exception for {Method} {Path}", ctx.Request.Method, ctx.Request.Path);
            await HandleExceptionAsync(ctx, ex);
        }
    }

    private Task HandleExceptionAsync(HttpContext ctx, Exception ex)
    {
        var (statusCode, title) = ex switch
        {
            KeyNotFoundException   => (HttpStatusCode.NotFound,            "Not Found"),
            UnauthorizedAccessException => (HttpStatusCode.Forbidden,      "Forbidden"),
            ArgumentException      => (HttpStatusCode.BadRequest,          "Bad Request"),
            InvalidOperationException => (HttpStatusCode.UnprocessableEntity, "Unprocessable Entity"),
            _                      => (HttpStatusCode.InternalServerError, "Internal Server Error")
        };

        ctx.Response.ContentType = "application/problem+json";
        ctx.Response.StatusCode  = (int)statusCode;

        var problem = new
        {
            type    = $"https://tools.ietf.org/html/rfc7807#{(int)statusCode}",
            title,
            status  = (int)statusCode,
            detail  = _env.IsDevelopment() ? ex.Message : title,
            traceId = ctx.TraceIdentifier,
            errors  = _env.IsDevelopment() ? ex.StackTrace : null
        };

        return ctx.Response.WriteAsync(JsonSerializer.Serialize(problem));
    }
}

public static class ExceptionMiddlewareExtensions
{
    public static IApplicationBuilder UseCustomExceptionHandler(this IApplicationBuilder app)
        => app.UseMiddleware<ExceptionMiddleware>();
}
