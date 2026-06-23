import { Dashboard } from './Dashboard';

export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background -z-10" />
      <div className="container-wrapper py-16">
        <div className="flex flex-col items-center mb-16 text-center space-y-4">
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-4 backdrop-blur-sm">
            <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
            Aligner v1.0
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground">
            Align Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-chart-4">Workflow</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            A premium dashboard for managing users and ensuring perfect harmony across your organization's data.
          </p>
        </div>
        
        <Dashboard />
      </div>
    </main>
  );
}
