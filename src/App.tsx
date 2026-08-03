import { useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { WorkoutProvider } from "./context/WorkoutContext";
import { useExercises } from "./hooks/useExercises";
import { ExercisesPage } from "./pages/ExercisesPage";
import { PlaybackPage } from "./pages/PlaybackPage";
import { PlanPage } from "./pages/PlanPage";

function App() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");

  const catalog = useExercises(query, category);

  return (
    <WorkoutProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route
            path="/"
            element={
              <ExercisesPage
                query={query}
                onQueryChange={setQuery}
                category={category}
                onCategoryChange={setCategory}
                filteredExercises={catalog.filteredExercises}
                categories={catalog.categories}
                isLoading={catalog.isLoading}
                error={catalog.error}
              />
            }
          />
          <Route path="/terv" element={<PlanPage exercisesById={catalog.exercisesById} />} />
          <Route path="/lejatszas" element={<PlaybackPage exercisesById={catalog.exercisesById} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </WorkoutProvider>
  );
}

export default App;
