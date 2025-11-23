FROM ruby:3.2

# Install dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /site

# Copy Gemfile and install gems
COPY Gemfile* ./
RUN gem update --system && bundle install

# Copy the rest of the site
COPY . .

# Expose port 4000
EXPOSE 4000

# Run Jekyll
CMD ["bundle", "exec", "jekyll", "serve", "--host", "0.0.0.0", "-w", "--future", "-l", "--incremental"]