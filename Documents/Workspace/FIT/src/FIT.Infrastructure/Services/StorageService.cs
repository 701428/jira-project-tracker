using FIT.Domain.Interfaces;
using Microsoft.Extensions.Configuration;

namespace FIT.Infrastructure.Services;

public class StorageService : IStorageService
{
    private readonly string _uploadRoot;

    public StorageService(IConfiguration config)
    {
        _uploadRoot = config["Storage:UploadPath"] ?? "uploads";
        Directory.CreateDirectory(_uploadRoot);
    }

    public async Task<string> SaveFileAsync(Stream fileStream, string fileName, string folder, CancellationToken cancellationToken = default)
    {
        var dir = Path.Combine(_uploadRoot, folder);
        Directory.CreateDirectory(dir);
        var uniqueName = $"{Guid.NewGuid()}_{Path.GetFileName(fileName)}";
        var fullPath = Path.Combine(dir, uniqueName);
        await using var fs = File.Create(fullPath);
        await fileStream.CopyToAsync(fs, cancellationToken);
        return Path.Combine(folder, uniqueName).Replace('\\', '/');
    }

    public Task DeleteAsync(string path, CancellationToken cancellationToken = default)
    {
        var fullPath = Path.Combine(_uploadRoot, path.Replace('/', Path.DirectorySeparatorChar));
        if (File.Exists(fullPath)) File.Delete(fullPath);
        return Task.CompletedTask;
    }

    public string GetPublicUrl(string path) => $"/uploads/{path}";
}
