import { QueryClient } from "@tanstack/react-query";
import { invalidateDirectoryQueries } from "@/lib/directory-cache";

it("invalidates directory, breadcrumb, summary, accessible, reception, and document data", () => {
  const client = new QueryClient();
  jest.spyOn(client, "invalidateQueries");
  invalidateDirectoryQueries(client);
  expect(client.invalidateQueries).toHaveBeenCalledTimes(6);
  expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["directory-breadcrumb"] });
  expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["directory-reception"] });
  expect(client.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["documents"] });
});
