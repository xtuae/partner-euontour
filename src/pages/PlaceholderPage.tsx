export const PlaceholderPage = ({ title }: { title: string }) => (
    <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">{title}</h1>
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded text-yellow-800">
            This page is under construction.
        </div>
    </div>
);
