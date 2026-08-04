FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY FIT.API/FIT.API.csproj             FIT.API/
COPY FIT.Application/FIT.Application.csproj FIT.Application/
COPY FIT.Domain/FIT.Domain.csproj       FIT.Domain/
COPY FIT.Infrastructure/FIT.Infrastructure.csproj FIT.Infrastructure/

RUN dotnet restore FIT.API/FIT.API.csproj

COPY . .
RUN dotnet publish FIT.API/FIT.API.csproj -c Release -o /app/publish \
    --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*
RUN adduser --system --uid 1001 appuser

COPY --from=build /app/publish .
RUN mkdir -p uploads logs && chown -R appuser /app

USER appuser
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

ENTRYPOINT ["dotnet", "FIT.API.dll"]
