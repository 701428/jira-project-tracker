using System.Text;
using FIT.Application;
using FIT.Infrastructure;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Serilog;
using Serilog.Events;

var builder = WebApplication.CreateBuilder(args);

// ── Serilog ────────────────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Override("Microsoft", LogEventLevel.Warning)
    .Enrich.FromLogContext()
    .WriteTo.Console()
    .WriteTo.File("logs/fit-.log", rollingInterval: RollingInterval.Day)
    .ReadFrom.Configuration(builder.Configuration)
    .CreateLogger();

builder.Host.UseSerilog();

var services = builder.Services;
var config   = builder.Configuration;

// ── Infrastructure & Application ────────────────────────
services.AddInfrastructure(config);
services.AddApplication();

// ── Controllers ──────────────────────────────────────────
services.AddControllers();
services.AddHttpContextAccessor();

// ── Authentication — JWT Bearer ──────────────────────────
var jwtSecret = config["Jwt:Secret"] ?? throw new InvalidOperationException("Jwt:Secret missing");
services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(opt =>
    {
        opt.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuerSigningKey = true,
            IssuerSigningKey         = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            ValidateIssuer           = true,
            ValidIssuer              = config["Jwt:Issuer"],
            ValidateAudience         = true,
            ValidAudience            = config["Jwt:Audience"],
            ClockSkew                = TimeSpan.Zero
        };
    });

services.AddAuthorization();

// ── CORS ───────────────────────────────────────────────
services.AddCors(opt => opt.AddPolicy("FrontendPolicy", p =>
    p.WithOrigins(config.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? new[] { "http://localhost:3000" })
     .AllowAnyHeader()
     .AllowAnyMethod()
     .AllowCredentials()));

// ── Swagger ──────────────────────────────────────────────
services.AddEndpointsApiExplorer();
services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "FIT API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "JWT Bearer token. Format: Bearer {token}",
        Name        = "Authorization",
        In          = ParameterLocation.Header,
        Type        = SecuritySchemeType.Http,
        Scheme      = "bearer",
        BearerFormat = "JWT"
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme { Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" } },
            Array.Empty<string>()
        }
    });
});

// ── Health Checks ──────────────────────────────────────────
services.AddHealthChecks();

// ── Build ────────────────────────────────────────────────
var app = builder.Build();

// ── Exception Handling ───────────────────────────────────────
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async ctx =>
    {
        var ex      = ctx.Features.Get<IExceptionHandlerFeature>()?.Error;
        var logger  = ctx.RequestServices.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Unhandled exception");

        ctx.Response.StatusCode  = ex is KeyNotFoundException ? 404 : 500;
        ctx.Response.ContentType = "application/problem+json";

        await ctx.Response.WriteAsJsonAsync(new
        {
            type     = "https://tools.ietf.org/html/rfc7807",
            title    = ex is KeyNotFoundException ? "Not Found" : "Internal Server Error",
            status   = ctx.Response.StatusCode,
            detail   = app.Environment.IsDevelopment() ? ex?.Message : "An error occurred.",
            traceId  = ctx.TraceIdentifier
        });
    });
});

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "FIT API v1"));
}

app.UseStaticFiles();   // serve uploads/
app.UseSerilogRequestLogging();
app.UseCors("FrontendPolicy");
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapHealthChecks("/health");

app.Run();
