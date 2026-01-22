import { Link } from '@tanstack/react-router'

export function NotFound() {
    return (
        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center bg-black">
            <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center text-4xl mb-6 animate-bounce">
                👻
            </div>
            <h1 className="text-4xl font-bold text-white mb-4">Page Not Found</h1>
            <p className="text-gray-400 max-w-md mx-auto mb-8">
                The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
            </p>
            <div className="flex gap-4">
                <Link
                    to="/"
                    className="px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition-colors"
                >
                    Go Home
                </Link>
                <Link
                    to="/skills"
                    className="px-6 py-3 bg-zinc-900 border border-zinc-800 text-white font-medium rounded-lg hover:bg-zinc-800 transition-colors"
                >
                    Browse Skills
                </Link>
            </div>
        </div>
    )
}
