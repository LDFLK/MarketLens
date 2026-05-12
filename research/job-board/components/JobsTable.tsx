import { Job } from "@/types/job";

interface Props {
  jobs: Job[];
  onRowClick: (job: Job) => void; // add this
}

export default function JobsTable({ jobs, onRowClick }: Props) {
  if (jobs.length === 0)
    return <p className="text-center text-gray-500 py-10">No jobs found.</p>;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-gray-50 text-gray-600 uppercase text-xs">
          <tr>
            <th className="px-4 py-3">Employer</th>
            <th className="px-4 py-3">Role</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Location</th>
            <th className="px-4 py-3">Offers</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {jobs.map((job, i) => (
            <tr
              key={i}
              onClick={() => onRowClick(job)} // add this
              className="hover:bg-blue-40 cursor-pointer transition-colors" // cursor pointer
            >
              <td className="px-4 py-3 font-medium">{job.employer}</td>
              <td className="px-4 py-3">{job.job_role}</td>
              <td className="px-4 py-3">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                  {job.job_type}
                </span>
              </td>
              <td className="px-4 py-3">{job.location}</td>
              <td className="px-4 py-3 text-gray-500 truncate max-w-xs">
                {job.offers}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
