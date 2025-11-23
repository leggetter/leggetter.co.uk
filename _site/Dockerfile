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

# Create startup script that runs Jekyll and copies images after initial build
RUN echo '#!/bin/bash\n\
bundle exec jekyll serve --host 0.0.0.0 -w --future -l --incremental &\n\
JEKYLL_PID=$!\n\
echo "Waiting for initial Jekyll build..."\n\
sleep 10\n\
if [ -d "_includes/realtime-web-technologies-guide/images" ]; then\n\
    echo "Copying realtime-web-technologies-guide images..."\n\
    mkdir -p _site/real-time-web-technologies-guide\n\
    cp -r _includes/realtime-web-technologies-guide/images _site/real-time-web-technologies-guide/\n\
    echo "Images copied successfully"\n\
fi\n\
wait $JEKYLL_PID' > /start.sh && chmod +x /start.sh

# Run startup script
CMD ["/start.sh"]