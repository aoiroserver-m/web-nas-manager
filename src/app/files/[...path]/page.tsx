import AppShell from "@/components/AppShell";
import BreadcrumbNav from "@/components/BreadcrumbNav";
import FileListContainer from "@/components/FileListContainer";

interface FilesPageProps {
  params: Promise<{ path: string[] }>;
}

export default async function FilesPage({ params }: FilesPageProps) {
  const { path: pathSegments } = await params;
  const currentPath = pathSegments.map(decodeURIComponent).join("/");

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        <BreadcrumbNav currentPath={currentPath} />
        <FileListContainer currentPath={currentPath} />
      </div>
    </AppShell>
  );
}
