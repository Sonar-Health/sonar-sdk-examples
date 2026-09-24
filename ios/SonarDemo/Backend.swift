import Foundation

/// The app's own backend (`backend/` in this repository). It holds the Sonar API key; the app only holds its own sign-in.
struct Backend: Sendable, Equatable {
    let url: URL
    let accessCode: String

    struct Config: Decodable, Sendable {
        let appId: String
        let userId: String

        enum CodingKeys: String, CodingKey {
            case appId = "app_id"
            case userId = "user_id"
        }
    }

    struct Failure: LocalizedError {
        let status: Int
        let body: String

        var errorDescription: String? {
            status == 401 ? "The backend refused the access code." : "The backend answered \(status): \(body.prefix(200))"
        }
    }

    func config() async throws -> Config {
        try await get("config")
    }

    func sdkToken(installationId: String) async throws -> String {
        struct Minted: Decodable {
            let clientToken: String
            enum CodingKeys: String, CodingKey { case clientToken = "client_token" }
        }
        var request = request("sdk-token")
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(["installation_id": installationId])
        let minted: Minted = try await send(request)
        return minted.clientToken
    }

    func daily(_ metrics: [Metric], days: Int) async throws -> DailySeries {
        try await get("health/daily", ["types": metrics.map(\.rawValue).joined(separator: ","), "from_date": Day.ago(days - 1)])
    }

    func scores(days: Int) async throws -> Scores {
        try await get("health/scores", ["from_date": Day.ago(days - 1)])
    }

    func sleep(days: Int) async throws -> [SleepSession] {
        let page: SleepPage = try await get("health/sleep", ["from_date": Day.ago(days - 1)])
        return page.data
    }

    func heartRateToday() async throws -> Timeseries {
        try await get("health/timeseries", ["metric": "heart_rate", "resolution": "15m"])
    }

    private func get<Body: Decodable>(_ path: String, _ query: [String: String] = [:]) async throws -> Body {
        var request = request(path)
        if !query.isEmpty {
            request.url?.append(queryItems: query.sorted { $0.key < $1.key }.map { URLQueryItem(name: $0.key, value: $0.value) })
        }
        return try await send(request)
    }

    private func request(_ path: String) -> URLRequest {
        var request = URLRequest(url: url.appending(path: path))
        request.setValue("Bearer \(accessCode)", forHTTPHeaderField: "Authorization")
        request.timeoutInterval = 30
        return request
    }

    private func send<Body: Decodable>(_ request: URLRequest) async throws -> Body {
        let (body, response) = try await URLSession.shared.data(for: request)
        let status = (response as? HTTPURLResponse)?.statusCode ?? 0
        guard status == 200 || status == 201 else {
            throw Failure(status: status, body: String(decoding: body, as: UTF8.self))
        }
        return try JSONDecoder().decode(Body.self, from: body)
    }
}
