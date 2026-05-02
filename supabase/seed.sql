-- Optional: insert a few sample jobs for local UI development
insert into jobs (source, external_id, title, company, location, url, score, score_reasoning, posted_at)
values
  ('indeed', 'sample-001', 'Software Engineer', 'Acme Corp', 'Remote', 'https://indeed.com', 87.5, 'Strong Python and AWS match. Missing Kubernetes experience.', now() - interval '1 day'),
  ('linkedin', 'sample-002', 'Backend Engineer', 'Beta Inc', 'New York, NY', 'https://linkedin.com', 72.0, 'Good overall fit. Role requires Java which is not on resume.', now() - interval '2 days'),
  ('indeed', 'sample-003', 'Cloud Engineer', 'Gamma LLC', 'Seattle, WA', 'https://indeed.com', 91.0, 'Excellent match — AWS, Python, serverless all present.', now() - interval '3 days');
